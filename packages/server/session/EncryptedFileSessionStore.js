"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { encryptValue, decryptValue } = require("./credentialCrypto");

/**
 * Persist long-lived ("remember me") sessions to a single encrypted file.
 *
 * The whole session map is serialised to JSON and encrypted with AES-256-GCM
 * before being written to disk. Sessions are keyed by the SHA-256 hash of the
 * session id so the random id is never stored in plaintext on disk.
 *
 * On-disk format (data/sessions.enc):
 *   { iv, tag, data }  where data decrypts to { [sessionIdHash]: session }
 */
class EncryptedFileSessionStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.sessions = new Map();
    this.#load();
  }

  #load() {
    if (!fs.existsSync(this.filePath)) return;

    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const payload = JSON.parse(raw);
      const decrypted = decryptValue(payload);
      this.sessions = new Map(Object.entries(decrypted));
    } catch (error) {
      // If the file cannot be decrypted (e.g. the encryption key changed),
      // treat it as empty so old/foreign sessions are invalidated safely.
      this.sessions = new Map();
    }
  }

  #persist() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

    const map = Object.fromEntries(this.sessions.entries());
    const payload = encryptValue(map);
    // Write atomically to avoid corrupting the file on crash.
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  static hash(sessionId) {
    return crypto.createHash("sha256").update(sessionId).digest("hex");
  }

  set(session) {
    this.sessions.set(EncryptedFileSessionStore.hash(session.id), session);
    this.#persist();
  }

  get(id) {
    const entry = this.sessions.get(EncryptedFileSessionStore.hash(id));
    return entry || null;
  }

  delete(id) {
    const had = this.sessions.has(EncryptedFileSessionStore.hash(id));
    this.sessions.delete(EncryptedFileSessionStore.hash(id));
    this.#persist();
    return had;
  }

  has(id) {
    return this.sessions.has(EncryptedFileSessionStore.hash(id));
  }

  all() {
    return Array.from(this.sessions.values());
  }

  /**
   * Remove expired sessions and persist the remaining set.
   * @param {(session: object) => boolean} isExpired
   */
  purge(isExpired) {
    let changed = false;
    for (const [hash, session] of this.sessions.entries()) {
      if (isExpired(session)) {
        this.sessions.delete(hash);
        changed = true;
      }
    }
    if (changed) this.#persist();
  }
}

module.exports = EncryptedFileSessionStore;
