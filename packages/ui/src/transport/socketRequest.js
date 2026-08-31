import { ERROR_CODES, socketError } from "./transportError";

/**
 * Create a request helper bound to a socket. It emits an event, resolves with
 * the raw ACK payload, and applies an optional timeout / cancellation signal.
 * It contains no business logic — the protocol layer normalises the response.
 *
 * @param {object} socket a Socket.IO client
 * @returns {(event: string, args?: object|Array, options?: {timeoutMs?: number, signal?: AbortSignal}) => Promise<*>}
 */
export function createSocketRequest(socket) {
  return function request(event, args, options = {}) {
    const { timeoutMs = 15000, signal } = options;

    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(socketError(ERROR_CODES.NOT_CONNECTED, event));
        return;
      }

      let settled = false;
      let timer;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onCancel);
      };
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };
      const onCancel = () =>
        settle(reject, socketError(ERROR_CODES.REQUEST_CANCELLED, event));

      if (signal) {
        if (signal.aborted) {
          reject(socketError(ERROR_CODES.REQUEST_CANCELLED, event));
          return;
        }
        signal.addEventListener("abort", onCancel);
      }

      timer = setTimeout(
        () => settle(reject, socketError(ERROR_CODES.REQUEST_TIMEOUT, event)),
        timeoutMs
      );

      const ack = (response) => settle(resolve, response);
      if (args === undefined) socket.emit(event, ack);
      else if (Array.isArray(args)) socket.emit(event, ...args, ack);
      else socket.emit(event, args, ack);
    });
  };
}
