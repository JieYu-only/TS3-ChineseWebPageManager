"use strict";

/**
 * Wrap an Express async route handler so a rejected Promise is forwarded to the
 * error middleware instead of becoming an unhandled rejection. Express 4 does
 * not catch rejected promises automatically.
 * @param {(req, res, next) => Promise<*>} handler
 * @returns {(req, res, next) => void}
 */
function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncRoute;
