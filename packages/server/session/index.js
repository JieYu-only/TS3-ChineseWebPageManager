"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const SessionManager = require("./SessionManager");

/**
 * Data directory for persisted sessions & the encryption key.
 * Defaults to <cwd>/data (excluded from git via .gitignore).
 * @returns {string}
 */
function getDataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

/**
 * The AES-256-GCM key used to encrypt persisted sessions.
 * Takes precedence from SESSION_ENCRYPTION_KEY; otherwise it is generated once
 * and persisted to <data>/session.key so long-lived sessions survive restarts
 * even without an env var configured.
 * @returns {string} base64 32-byte key
 */
function getEncryptionKey() {
  if (process.env.SESSION_ENCRYPTION_KEY) return process.env.SESSION_ENCRYPTION_KEY;

  const keyFile = path.join(getDataDir(), "session.key");

  if (fs.existsSync(keyFile)) {
    const key = fs.readFileSync(keyFile, "utf8").trim();
    if (key) {
      process.env.SESSION_ENCRYPTION_KEY = key;
      return key;
    }
  }

  const key = crypto.randomBytes(32).toString("base64");
  fs.mkdirSync(getDataDir(), { recursive: true });
  // Restrict the key file so only the service account can read it.
  fs.writeFileSync(keyFile, key, { encoding: "utf8", mode: 0o600 });
  process.env.SESSION_ENCRYPTION_KEY = key;
  return key;
}

// Bootstrap the key before any crypto/decryption runs.
getEncryptionKey();

const SESSION_FILE = path.join(getDataDir(), "sessions.enc");
process.env.SESSION_FILE = SESSION_FILE;

const sessionManager = new SessionManager({});

module.exports = {
  sessionManager,
  SESSION_FILE,
  getDataDir,
  getEncryptionKey,
  createSessionId: SessionManager.createSessionId,
  hashSessionId: SessionManager.hashSessionId,
};
