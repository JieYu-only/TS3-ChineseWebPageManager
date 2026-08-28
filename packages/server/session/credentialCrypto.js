"use strict";

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM

/**
 * Derive the 32-byte AES-256 key from the configured SESSION_ENCRYPTION_KEY.
 * The key is expected to be a base64-encoded 32-byte random value.
 * @returns {Buffer}
 */
function getKey() {
  const raw = process.env.SESSION_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("SESSION_ENCRYPTION_KEY 未设置，无法进行凭据加密");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("SESSION_ENCRYPTION_KEY 必须是 32 字节的 Base64 密钥");
  }

  return key;
}

/**
 * Encrypt a serializable value using AES-256-GCM.
 * @param {*} value
 * @returns {{iv: string, tag: string, data: string}}
 */
function encryptValue(value) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

/**
 * Decrypt a value produced by encryptValue.
 * @param {{iv: string, tag: string, data: string}} payload
 * @returns {*}
 */
function decryptValue(payload) {
  if (!payload || !payload.iv || !payload.tag || !payload.data) {
    throw new Error("无效的加密数据");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8"));
}

module.exports = { encryptValue, decryptValue, getKey };
