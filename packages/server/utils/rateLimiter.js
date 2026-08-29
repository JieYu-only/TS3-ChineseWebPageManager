"use strict";

/**
 * A sliding-window rate limiter keyed by an arbitrary string (normally an IP).
 * It is intentionally dependency-free and in-memory; limits reset on restart.
 */
class SlidingWindowRateLimiter {
  /**
   * @param {{windowMs: number, max: number}} options
   */
  constructor({ windowMs, max }) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map();
  }

  /**
   * Register a hit for a key and report whether the key is still allowed.
   * @param {string} key
   * @returns {{allowed: boolean, remaining: number, retryAfterMs: number}}
   */
  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = (this.hits.get(key) || []).filter(
      (t) => t > windowStart
    );

    if (timestamps.length >= this.max) {
      this.hits.set(key, timestamps);
      const earliest = timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, earliest + this.windowMs - now),
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return {
      allowed: true,
      remaining: this.max - timestamps.length,
      retryAfterMs: 0,
    };
  }

  /**
   * Drop all recorded hits for a key (e.g. after a successful login).
   * @param {string} key
   */
  reset(key) {
    this.hits.delete(key);
  }
}

module.exports = { SlidingWindowRateLimiter };
