import {
  login as httpLogin,
  logout as httpLogout,
  status as httpStatus,
} from "@/api/session";
import socket, { connectToSession } from "@/socket";
import TeamSpeak from "@/api/TeamSpeak";
import eventService from "@/services/eventService";

/**
 * Session lifecycle is owned here: log in, log out, restore a server-side
 * session and switch virtual servers. Components never connect/disconnect the
 * socket themselves.
 */
export default {
  async login(payload) {
    const response = await httpLogin(payload);
    await connectToSession();
    return response;
  },
  async logout() {
    // Release every business subscription before leaving the session so stale
    // listeners never fire against the next one.
    eventService.clear();

    try {
      return await httpLogout();
    } finally {
      // Always tear down the local socket, even if the server-side logout
      // fails — otherwise the authenticated connection could keep running.
      socket.disconnect();
    }
  },
  async restore() {
    const response = await httpStatus();
    if (response.connected) await connectToSession();
    return response;
  },
  async selectServer(serverId) {
    return TeamSpeak.selectServer(serverId);
  },
};
