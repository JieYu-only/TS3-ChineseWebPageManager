"use strict";

/**
 * Create an Error with an HTTP status code attached so Express's error
 * middleware can return the correct status. `expose` marks the message as safe
 * to reveal to the caller (as opposed to internal error details).
 * @param {number} status
 * @param {string} message
 * @returns {Error}
 */
function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

/**
 * Create a 4xx client error with a message safe to send back to the caller.
 * @param {string} message
 * @param {number} [status]
 * @returns {Error}
 */
function createClientError(message, status = 400) {
  return createHttpError(status, message);
}

module.exports = { createHttpError, createClientError };
