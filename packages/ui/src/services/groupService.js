import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

function requireId(value, message, operation) {
  if (value === undefined || value === null || value === "") {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message,
      operation,
    });
  }
  return value;
}

function requireName(name, operation) {
  if (typeof name !== "string" || name === "") {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少组名称",
      operation,
    });
  }
  return name;
}

/**
 * Group operations (server groups and channel groups) plus a group's client
 * memberships. Components call these business methods and never name raw
 * TeamSpeak commands (servergrouplist/servergroupadd/servergrouprename/
 * servergroupcopy/servergroupdel/servergroupclientlist/servergroupaddclient/
 * servergroupdelclient/serverinfo/channelgrouplist/channelgroupadd/
 * channelgrouprename/channelgroupcopy/channelgroupdel/
 * channelgroupclientlist/setclientchannelgroup).
 */
export default {
  // ---- server groups ----
  async listServerGroups() {
    return TeamSpeak.getServerGroupList();
  },
  async defaultServerGroupId() {
    const [info] = await TeamSpeak.getServerInfo();
    return info.virtualserverDefaultServerGroup;
  },
  async createServerGroup({ name, type }) {
    return TeamSpeak.execute("servergroupadd", {
      name: requireName(name, "group.server.create"),
      type,
    });
  },
  async renameServerGroup({ serverGroupId, name }) {
    await TeamSpeak.execute("servergrouprename", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "group.server.rename"),
      name: requireName(name, "group.server.rename"),
    });
  },
  async copyServerGroup({ sourceGroupId, targetGroupId, name, type }) {
    return TeamSpeak.execute("servergroupcopy", {
      ssgid: requireId(sourceGroupId, "缺少服务器组 ID", "group.server.copy"),
      tsgid: targetGroupId || 0,
      name: requireName(name, "group.server.copy"),
      type,
    });
  },
  async removeServerGroup({ serverGroupId, force }) {
    return TeamSpeak.execute("servergroupdel", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "group.server.remove"),
      force: +force,
    });
  },
  async listServerGroupClients(serverGroupId) {
    return TeamSpeak.execute("servergroupclientlist", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "group.server.clients"),
    });
  },
  async addClientToServerGroup({ serverGroupId, clientDbId }) {
    return TeamSpeak.execute("servergroupaddclient", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "group.server.addclient"),
      cldbid: requireId(clientDbId, "缺少用户 ID", "group.server.addclient"),
    });
  },
  async removeClientFromServerGroup({ serverGroupId, clientDbId }) {
    return TeamSpeak.execute("servergroupdelclient", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "group.server.delclient"),
      cldbid: requireId(clientDbId, "缺少用户 ID", "group.server.delclient"),
    });
  },

  // ---- channel groups ----
  async listChannelGroups() {
    return TeamSpeak.getChannelGroupList();
  },
  async defaultChannelGroupId() {
    const [info] = await TeamSpeak.getServerInfo();
    return info.virtualserverDefaultChannelGroup;
  },
  async createChannelGroup({ name, type }) {
    return TeamSpeak.execute("channelgroupadd", {
      name: requireName(name, "group.channel.create"),
      type,
    });
  },
  async renameChannelGroup({ channelGroupId, name }) {
    await TeamSpeak.execute("channelgrouprename", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "group.channel.rename"),
      name: requireName(name, "group.channel.rename"),
    });
  },
  async copyChannelGroup({ sourceGroupId, targetGroupId, name, type }) {
    return TeamSpeak.execute("channelgroupcopy", {
      scgid: requireId(sourceGroupId, "缺少频道组 ID", "group.channel.copy"),
      tcgid: targetGroupId || 0,
      name: requireName(name, "group.channel.copy"),
      type,
    });
  },
  async removeChannelGroup({ channelGroupId, force }) {
    return TeamSpeak.execute("channelgroupdel", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "group.channel.remove"),
      force: +force,
    });
  },
  async listChannelGroupClients({ channelGroupId, channelId }) {
    return TeamSpeak.execute("channelgroupclientlist", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "group.channel.clients"),
      cid: channelId,
    });
  },
  async assignClientChannelGroup({ channelGroupId, channelId, clientDbId }) {
    return TeamSpeak.execute("setclientchannelgroup", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "group.channel.assign"),
      cid: channelId,
      cldbid: requireId(clientDbId, "缺少用户 ID", "group.channel.assign"),
    });
  },
};
