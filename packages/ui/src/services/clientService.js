import TeamSpeak from "@/api/TeamSpeak";

/**
 * Business operations over clients (and a client's server-group memberships).
 * Components call these methods and never name raw TeamSpeak commands
 * (clientlist/clientdblist/clientinfo/clientdbinfo/clientedit/clientdbdelete/
 * clientkick/clientpoke/clientmove/banadd/servergroup*client).
 */
export default {
  listOnline() {
    return TeamSpeak.getClientList();
  },
  listDatabase() {
    return TeamSpeak.fullClientDBList();
  },
  async info(clientId) {
    const [info] = await TeamSpeak.execute("clientinfo", { clid: clientId });
    return info;
  },
  async dbInfo(clientDbId) {
    const [info] = await TeamSpeak.execute("clientdbinfo", {
      cldbid: clientDbId,
    });
    return info;
  },
  async remove(clientDbId) {
    await TeamSpeak.execute("clientdbdelete", { cldbid: clientDbId });
  },
  async edit(clientId, props) {
    await TeamSpeak.execute("clientedit", { clid: clientId, ...props });
  },
  moveToChannel({ clientId, channelId }) {
    return TeamSpeak.execute("clientmove", { clid: clientId, cid: channelId });
  },
  async kick({ clientId, reasonId, reasonMessage }) {
    await TeamSpeak.execute("clientkick", {
      clid: clientId,
      reasonid: reasonId,
      reasonmsg: reasonMessage,
    });
  },
  async poke({ clientId, message }) {
    await TeamSpeak.execute("clientpoke", { clid: clientId, msg: message });
  },
  async ban(input) {
    await TeamSpeak.execute("banadd", input);
  },
  async defaultServerGroupId() {
    const [info] = await TeamSpeak.getServerInfo();
    return info.virtualserverDefaultServerGroup;
  },
  listServerGroups() {
    return TeamSpeak.getServerGroupList();
  },
  async addToServerGroup(serverGroupId, clientDbId) {
    await TeamSpeak.execute("servergroupaddclient", {
      sgid: serverGroupId,
      cldbid: clientDbId,
    });
  },
  async removeFromServerGroup(serverGroupId, clientDbId) {
    await TeamSpeak.execute("servergroupdelclient", {
      sgid: serverGroupId,
      cldbid: clientDbId,
    });
  },
};
