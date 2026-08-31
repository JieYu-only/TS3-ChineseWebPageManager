import TeamSpeak from "@/api/TeamSpeak";

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
  async create(input) {
    const [response] = await TeamSpeak.execute("servercreate", input);
    return response;
  },
  async start(serverId) {
    await TeamSpeak.execute("serverstart", { sid: serverId });
  },
  async stop(serverId) {
    await TeamSpeak.execute("serverstop", { sid: serverId });
  },
  async remove(serverId) {
    await TeamSpeak.execute("serverdelete", { sid: serverId });
  },
  select(serverId) {
    return TeamSpeak.selectServer(serverId);
  },
  async changeName(input) {
    await TeamSpeak.execute("serveredit", input);
  },
};
