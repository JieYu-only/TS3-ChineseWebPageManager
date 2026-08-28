"use strict";

const crypto = require("crypto");
const MemorySessionStore = require("./MemorySessionStore");
const EncryptedFileSessionStore = require("./EncryptedFileSessionStore");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Session lifetimes (tunable via env for operators who want different values).
const TEMP_SESSION_TTL_MS =
  Number(process.env.SESSION_TEMP_TTL_MS) || 8 * HOUR; // 普通登录 8 小时
const REMEMBER_SESSION_TTL_MS =
  Number(process.env.SESSION_REMEMBER_TTL_MS) || 30 * DAY; // 记住登录 30 天
const IDLE_TTL_MS = Number(process.env.SESSION_IDLE_TTL_MS) || 8 * HOUR; // 空闲 8 小时

/**
 * Create a cryptographically random session id.
 * @returns {string}
 */
function createSessionId() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash a session id so it is never stored in plaintext on disk.
 * @param {string} sessionId
 * @returns {string}
 */
function hashSessionId(sessionId) {
  return crypto.createHash("sha256").update(sessionId).digest("hex");
}

class SessionManager {
  constructor({ memoryStore, encryptedStore } = {}) {
    this.memory = memoryStore || new MemorySessionStore();
    this.encrypted = encryptedStore || new EncryptedFileSessionStore(process.env.SESSION_FILE);
    this._timer = null;
  }

  /**
   * Create a new session.
   * @param {{credentials: object, remember?: boolean, serverId?: string}} input
   * @returns {object} session
   */
  create({ credentials, remember = false, serverId = null }) {
    const now = Date.now();
    const ttl = remember ? REMEMBER_SESSION_TTL_MS : TEMP_SESSION_TTL_MS;

    const session = {
      id: createSessionId(),
      credentials,
      serverId,
      remember,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now + ttl,
    };

    this.memory.set(session);

    if (remember) {
      this.encrypted.set(session);
    }

    return session;
  }

  /**
   * Read a session by id, refreshing its last-used timestamp.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    if (!id) return null;

    let session = this.memory.get(id) || this.encrypted.get(id);

    if (!session) return null;

    if (this._isExpired(session)) {
      this.delete(id);
      return null;
    }

    session.lastUsedAt = Date.now();
    this.memory.set(session);
    if (session.remember) this.encrypted.set(session);
    return session;
  }

  /**
   * Delete a session from both memory and the encrypted file.
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    this.memory.delete(id);
    return this.encrypted.delete(id);
  }

  /**
   * @param {object} session
   * @returns {boolean}
   */
  _isExpired(session) {
    const now = Date.now();
    if (session.expiresAt && now > session.expiresAt) return true;

    if (now - session.lastUsedAt > IDLE_TTL_MS) return true;

    return false;
  }

  /**
   * Remove all expired sessions from memory and the encrypted file.
   * @returns {number} number of removed sessions
   */
  deleteExpired() {
    let removed = 0;
    const isExpired = (s) => {
      if (this._isExpired(s)) {
        removed++;
        return true;
      }
      return false;
    };

    for (const session of this.memory.all()) {
      if (isExpired(session)) this.memory.delete(session.id);
    }

    this.encrypted.purge(isExpired);
    return removed;
  }

  /**
   * Persist the selected virtual server for subsequent page loads/restarts.
   * @param {string} id
   * @param {string|number|null} serverId
   * @returns {object|null}
   */
  updateServerId(id, serverId) {
    const session = this.get(id);
    if (!session) return null;

    session.serverId = serverId == null ? null : String(serverId);
    this.memory.set(session);
    if (session.remember) this.encrypted.set(session);
    return session;
  }

  /**
   * Start the periodic cleanup of expired sessions.
   * @param {number} [intervalMs]
   */
  startCleanup(intervalMs = 15 * 60 * 1000) {
    this.stopCleanup();
    this._timer = setInterval(() => this.deleteExpired(), intervalMs);
    if (this._timer.unref) this._timer.unref();
  }

  stopCleanup() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

module.exports = SessionManager;
module.exports.createSessionId = createSessionId;
module.exports.hashSessionId = hashSessionId;
