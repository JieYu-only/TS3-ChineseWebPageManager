import TeamSpeak from "@/api/TeamSpeak";

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
      cid: channelId,
    });
    return info;
  },
  create(input) {
    return TeamSpeak.execute("channelcreate", input);
  },
  edit({ channelId, ...props }) {
    return TeamSpeak.execute("channeledit", {
      cid: channelId,
      ...props,
    });
  },
  remove({ channelId, force }) {
    return TeamSpeak.execute("channeldelete", {
      cid: channelId,
      force,
    });
  },
  moveClient({ clientId, channelId }) {
    return TeamSpeak.execute("clientmove", {
      clid: clientId,
      cid: channelId,
    });
  },
};
