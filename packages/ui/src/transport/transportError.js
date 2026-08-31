/**
 * Stable error codes the communication layer raises. Components should branch
 * on these codes, never on raw Socket ACKs or TeamSpeak error text.
 */
export const ERROR_CODES = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  NOT_CONNECTED: "NOT_CONNECTED",
  CONNECTION_LOST: "CONNECTION_LOST",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  REQUEST_CANCELLED: "REQUEST_CANCELLED",
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  TRANSFER_FAILED: "TRANSFER_FAILED",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  PROTOCOL_ERROR: "PROTOCOL_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * The unified error object thrown by the communication layer.
 * - code: stable code for programmatic branching
 * - message: default user-facing message
 * - operation: the failed business operation (e.g. "client.moveToChannel")
 * - retryable: whether the caller may retry safely
 * - cause: the original error, for diagnostics/logging only
 * - details: extra context (never credentials/tokens)
 */
export class ServiceError extends Error {
  constructor({
    code = ERROR_CODES.UNKNOWN_ERROR,
    message,
    operation,
    retryable = false,
    cause,
    details = {},
  } = {}) {
    super(message || code);
    this.name = "ServiceError";
    this.code = code;
    this.message = message || code;
    this.operation = operation;
    this.retryable = retryable;
    this.cause = cause;
    this.details = details;
  }
}

const TEAMSPEAK_ERROR_TO_CODE = {
  1281: ERROR_CODES.RESOURCE_NOT_FOUND, // empty result set
};

// Map the raw TeamSpeak error message/pattern to a stable code so callers can
// branch programmatically. Patterns are tested in order; the first hit wins.
const MESSAGE_TO_CODE = [
  [/(insufficient client permissions)/i, ERROR_CODES.PERMISSION_DENIED],
  [/(invalid loginname or password|invalid password)/i, ERROR_CODES.AUTH_REQUIRED],
  [/(not logged in|no permission|session.*expired)/i, ERROR_CODES.SESSION_EXPIRED],
  [/(database empty result set|file not found|not found)/i, ERROR_CODES.RESOURCE_NOT_FOUND],
  [/(invalid (parameter|name|id)|invalid parameter)/i, ERROR_CODES.INVALID_ARGUMENT],
  [/(already (member|in use)|in use|already exists|already exists)/i, ERROR_CODES.RESOURCE_CONFLICT],
  [/(server.*not running|server.*offline|connection failed|could not connect|unreachable)/i, ERROR_CODES.SERVER_UNAVAILABLE],
  [/(too large|exceed.*limit|file.*too large)/i, ERROR_CODES.FILE_TOO_LARGE],
  [/(transfer|download|upload).*(failed|error)/i, ERROR_CODES.TRANSFER_FAILED],
];

/**
 * Build a ServiceError from a TeamSpeak/transport-level raw error object.
 * @param {object} raw { id, message, connected, ... }
 * @param {string} operation
 * @returns {ServiceError}
 */
export function fromTeamSpeakError(raw, operation) {
  const rawMessage = raw && raw.message ? raw.message : "";

  let code = TEAMSPEAK_ERROR_TO_CODE[raw && raw.id];
  if (!code) {
    const hit = MESSAGE_TO_CODE.find(([pattern]) => pattern.test(rawMessage));
    code = hit ? hit[1] : ERROR_CODES.PROTOCOL_ERROR;
  }

  return new ServiceError({
    code,
    message: rawMessage,
    operation,
    cause: raw,
    details: {},
  });
}

/**
 * Build a ServiceError for socket-level failures (timeout, cancel, disconnect).
 * @param {string} code
 * @param {string} operation
 * @param {Error} [cause]
 * @returns {ServiceError}
 */
export function socketError(code, operation, cause) {
  return new ServiceError({ code, operation, cause });
}
