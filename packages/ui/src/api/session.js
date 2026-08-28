import axios from "axios";

/**
 * Base origin for API calls. In development this is the backend server
 * (VUE_APP_WEBSOCKET_URI); in production it is the same origin serving the SPA.
 * @returns {string}
 */
function apiBase() {
  const env = process.env.VUE_APP_WEBSOCKET_URI || window.location.origin;
  return new URL(env).origin;
}

/**
 * Log in using ServerQuery credentials. On success the server sets an
 * HttpOnly session cookie; the browser never stores credentials.
 * @param {object} payload { host, queryport, protocol, username, password, remember }
 * @returns {Promise<{connected: boolean, expiresAt?: number, remembered?: boolean}>}
 */
export function login(payload) {
  return axios
    .post(`${apiBase()}/api/session/login`, payload, {
      withCredentials: true,
    })
    .then((data) => data.data);
}

/**
 * Invalidate the current session and clear the cookie.
 * @returns {Promise<{connected: boolean}>}
 */
export function logout() {
  return axios
    .post(`${apiBase()}/api/session/logout`, null, {
      withCredentials: true,
    })
    .then((data) => data.data);
}

/**
 * Check whether the current session is still valid.
 * @returns {Promise<{connected: boolean, expiresAt?: number, serverId?: string}>}
 */
export function status() {
  return axios
    .get(`${apiBase()}/api/session/status`, {
      withCredentials: true,
    })
    .then((data) => data.data);
}

/** Persist the selected virtual server in the current server-side session. */
export function updateServer(serverId) {
  return axios
    .patch(
      `${apiBase()}/api/session/server`,
      { serverId },
      { withCredentials: true }
    )
    .then((data) => data.data);
}
