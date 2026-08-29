"use strict";

const crypto = require("crypto");
const { createClientError } = require("./error");

/**
 * Hash a raw ticket value so the ticket is never stored in plaintext.
 * @param {string} raw
 * @returns {string}
 */
function hashTicket(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

/**
 * In-memory one-time file-transfer ticket store.
 *
 * Tickets are issued by the server after it has run ftinitdownload /
 * ftinitupload over the authenticated ServerQuery connection. Only the ticket
 * hash is kept in memory, the ticket is bound to the issuing session and the
 * transfer direction, expires quickly and is deleted after use. They are not
 * persisted, so a restart invalidates every outstanding transfer.
 */
class TicketStore {
  /**
   * @param {{ttlMs: number}} [options]
   */
  constructor({ ttlMs = 45 * 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.tickets = new Map();
  }

  /**
   * Issue a new ticket and return the raw value (handed to the client) plus the
   * internally stored hash.
   * @param {object} data
   * @param {string} data.sessionId
   * @param {"download"|"upload"} data.direction
   * @param {string} data.host
   * @param {number} data.port
   * @param {string} data.ftkey
   * @param {number} data.expectedSize
   * @param {string} data.fileName
   * @returns {{raw: string}}
   */
  create({ sessionId, direction, host, port, ftkey, expectedSize, fileName }) {
    const raw = crypto.randomBytes(32).toString("base64url");
    const ticketHash = hashTicket(raw);
    const now = Date.now();

    this.tickets.set(ticketHash, {
      ticketHash,
      sessionIdHash: hashTicket(sessionId),
      direction,
      host,
      port,
      ftkey,
      expectedSize,
      fileName,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      used: false,
    });

    return { raw };
  }

  /**
   * Validate a raw ticket against the session and expected direction without
   * marking it used.
   * @param {string} raw
   * @param {{sessionId: string, direction: string}} opts
   * @returns {object}
   */
  validate(raw, { sessionId, direction }) {
    const ticketHash = hashTicket(raw);
    const ticket = this.tickets.get(ticketHash);

    if (!ticket) throw createClientError("文件传输凭证无效", 400);
    if (Date.now() > ticket.expiresAt) {
      this.tickets.delete(ticketHash);
      throw createClientError("文件传输凭证已过期", 410);
    }
    if (ticket.used) throw createClientError("文件传输凭证已使用", 409);
    if (ticket.sessionIdHash !== hashTicket(sessionId)) {
      throw createClientError("文件传输凭证与会话不匹配", 403);
    }
    if (ticket.direction !== direction) {
      throw createClientError("文件传输方向不匹配", 400);
    }

    return ticket;
  }

  /**
   * Validate a raw ticket and mark it used. Only one transfer can ever consume
   * a given ticket.
   * @param {string} raw
   * @param {{sessionId: string, direction: string}} opts
   * @returns {object}
   */
  consume(raw, opts) {
    const ticket = this.validate(raw, opts);
    ticket.used = true;
    return ticket;
  }

  /**
   * Remove a ticket by its raw value (called after a transfer settles).
   * @param {string} raw
   */
  delete(raw) {
    this.tickets.delete(hashTicket(raw));
  }

  /**
   * Remove all expired tickets.
   * @returns {number}
   */
  purge() {
    const now = Date.now();
    let removed = 0;
    for (const [hash, ticket] of this.tickets.entries()) {
      if (now > ticket.expiresAt) {
        this.tickets.delete(hash);
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * @returns {number} number of outstanding tickets
   */
  size() {
    return this.tickets.size;
  }
}

module.exports = { TicketStore, hashTicket };
