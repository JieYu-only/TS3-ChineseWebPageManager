"use strict";

/**
 * In-memory session store for temporary (non-remembered) logins.
 * Sessions here are never written to disk and are lost on process restart.
 */
class MemorySessionStore {
  constructor() {
    this.sessions = new Map();
  }

  set(session) {
    this.sessions.set(session.id, session);
  }

  get(id) {
    return this.sessions.get(id) || null;
  }

  delete(id) {
    this.sessions.delete(id);
  }

  has(id) {
    return this.sessions.has(id);
  }

  all() {
    return Array.from(this.sessions.values());
  }

  clear() {
    this.sessions.clear();
  }
}

module.exports = MemorySessionStore;
