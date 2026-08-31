import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

function requireServerId(serverId, operation) {
  if (serverId === undefined || serverId === null || serverId === "") {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少服务器 ID",
      operation,
    });
  }
  return serverId;
}

/**
 * Business operations over virtual servers. Components call these methods and
 * never name the raw TeamSpeak command (serverlist/servercreate/use/...).
 */
export default {
  list() {
    return TeamSpeak.getServerList();
  },
  whoAmI() {
    return TeamSpeak.whoAmI();
  },
  async info() {
    const [info] = await TeamSpeak.getServerInfo();
    return info;
  },
  async version() {
    const result = await TeamSpeak.execute("version");
    // The backend may return an empty result set (e.g. during a degraded
    // connection); don't crash the caller, just report "unknown".
    return result && result.length && result[0]
      ? result[0].version
      : undefined;
  },
  async create(input) {
    const [response] = await TeamSpeak.execute("servercreate", input);
    return response;
  },
  async start(serverId) {
    await TeamSpeak.execute("serverstart", {
      sid: requireServerId(serverId, "server.start"),
    });
  },
  async stop(serverId) {
    await TeamSpeak.execute("serverstop", {
      sid: requireServerId(serverId, "server.stop"),
    });
  },
  async remove(serverId) {
    await TeamSpeak.execute("serverdelete", {
      sid: requireServerId(serverId, "server.remove"),
    });
  },
  async select(serverId) {
    return TeamSpeak.selectServer(requireServerId(serverId, "server.select"));
  },
  async changeName(input) {
    await TeamSpeak.execute("serveredit", input);
  },
};
