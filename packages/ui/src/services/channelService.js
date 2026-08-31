import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

function requireChannelId(channelId) {
  if (channelId === undefined || channelId === null || channelId === "") {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少频道 ID",
      operation: "channel",
    });
  }
  return channelId;
}

/**
 * Business operations over channels and the channel tree. Components call these
 * methods and never name raw TeamSpeak commands (channellist/channelcreate/
 * channeledit/channeldelete/channelinfo/clientmove).
 */
export default {
  list() {
    return TeamSpeak.getChannelList();
  },
  serverInfo() {
    return TeamSpeak.getServerInfo().then((arr) => arr.pop());
  },
  async info(channelId) {
    const [info] = await TeamSpeak.execute("channelinfo", {
      cid: requireChannelId(channelId),
    });
    return info;
  },
  create(input) {
    return TeamSpeak.execute("channelcreate", input);
  },
  async edit({ channelId, ...props }) {
    await TeamSpeak.execute("channeledit", {
      cid: requireChannelId(channelId),
      ...props,
    });
  },
  async remove({ channelId, force }) {
    await TeamSpeak.execute("channeldelete", {
      cid: requireChannelId(channelId),
      force,
    });
  },
  async moveClient({ clientId, channelId }) {
    await TeamSpeak.execute("clientmove", {
      clid: clientId,
      cid: requireChannelId(channelId),
    });
  },
};
