/**
 * Base origin for API calls. In development this is the backend server
 * (VUE_APP_WEBSOCKET_URI); in production it is the same origin serving the SPA.
 * @returns {string}
 */
export function apiBase() {
  const env = process.env.VUE_APP_WEBSOCKET_URI || window.location.origin;
  return new URL(env).origin;
}
