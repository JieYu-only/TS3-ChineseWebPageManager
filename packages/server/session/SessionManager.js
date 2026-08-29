"use strict";

const crypto = require("crypto");
const MemorySessionStore = require("./MemorySessionStore");
const EncryptedFileSessionStore = require("./EncryptedFileSessionStore");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Per-session-type lifetimes. Temporary logins use a short absolute TTL and a
// short idle TTL; remembered logins may survive much longer and only expire
// after their own (much longer) idle TTL. All are tunable via env.
const TEMP_SESSION_TTL_MS =
  Number(process.env.SESSION_TEMP_TTL_MS) || 8 * HOUR; // 普通登录 8 小时
const REMEMBER_SESSION_TTL_MS =
  Number(process.env.SESSION_REMEMBER_TTL_MS) || 30 * DAY; // 记住登录 30 天
const TEMP_IDLE_TTL_MS =
  Number(process.env.SESSION_TEMP_IDLE_TTL_MS) || 8 * HOUR; // 普通会话空闲 8 小时
const REMEMBER_IDLE_TTL_MS =
  Number(process.env.SESSION_REMEMBER_IDLE_TTL_MS) || 30 * DAY; // 记住登录空闲 30 天

// Only persist a remembered session to disk when last used more than this long
// ago. Frequent reads still refresh lastUsedAt in memory without hammering disk.
const PERSIST_THROTTLE_MS =
  Number(process.env.SESSION_PERSIST_THROTTLE_MS) || 10 * 60 * 1000;

// Ceiling on simultaneously active sessions for one account (host+username).
const MAX_ACTIVE_PER_ACCOUNT =
  Number(process.env.SESSION_MAX_ACTIVE_PER_ACCOUNT) || 50;

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

function accountKey(credentials) {
  return `${credentials.host}:${credentials.username}`;
}

class SessionManager {
  constructor({ memoryStore, encryptedStore } = {}) {
    this.memory = memoryStore || new MemorySessionStore();
    this.encrypted =
      encryptedStore || new EncryptedFileSessionStore(process.env.SESSION_FILE);
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
      lastPersistAt: now,
      expiresAt: now + ttl,
    };

    // Limit the number of active sessions per account by evicting the oldest.
    const account = accountKey(credentials);
    const active = this._sessionsForAccount(account);
    if (active.length >= MAX_ACTIVE_PER_ACCOUNT) {
      const oldest = active.sort(
        (a, b) => a.lastUsedAt - b.lastUsedAt || a.createdAt - b.createdAt
      )[0];
      this.delete(oldest.id);
    }

    this.memory.set(session);

    if (remember) {
      this.encrypted.set(session);
    }

    return session;
  }

  /**
   * Read a session by id, refreshing its last-used timestamp in memory. Disk
   * persistence for remembered sessions is throttled so reads do not hammer the
   * filesystem.
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

    if (session.remember) {
      const lastPersist = session.lastPersistAt || session.createdAt || 0;
      if (Date.now() - lastPersist > PERSIST_THROTTLE_MS) {
        session.lastPersistAt = Date.now();
        this.encrypted.set(session);
      }
    }

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

    const idleTtl = session.remember
      ? REMEMBER_IDLE_TTL_MS
      : TEMP_IDLE_TTL_MS;

    if (now - session.lastUsedAt > idleTtl) return true;

    return false;
  }

  /**
   * Collect every active session (memory + encrypted) for a given account key.
   * @param {string} account
   * @returns {object[]}
   */
  _sessionsForAccount(account) {
    return [...this.memory.all(), ...this.encrypted.all()].filter(
      (s) => accountKey(s.credentials) === account
    );
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

    // A server-selection change is worth persisting immediately.
    if (session.remember) {
      session.lastPersistAt = Date.now();
      this.encrypted.set(session);
    }

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
