import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

/**
 * Reject a missing identifier before anything is sent to TeamSpeak.
 * @returns {*} the validated identifier
 */
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

const toNumber = (value) => Number(!!value);

/**
 * Permission operations. Components call these business methods and never name
 * raw TeamSpeak commands (permissionlist/clientpermlist/clientaddperm/
 * clientdelperm/channelpermlist/channeladdperm/channeldelperm/
 * channelclientpermlist/channelclientaddperm/channelclientdelperm/
 * channelgrouppermlist/channelgroupaddperm/channelgroupdelperm/
 * servergrouppermlist/servergroupaddperm/servergroupdelperm).
 */
export default {
  async listDefinitions() {
    return TeamSpeak.execute("permissionlist");
  },

  async listClientPermissions(clientDbId) {
    return TeamSpeak.execute("clientpermlist", {
      cldbid: requireId(clientDbId, "缺少用户 ID", "permission.client.list"),
    });
  },
  async addClientPermission({ clientDbId, permissionId, value, skip }) {
    return TeamSpeak.execute("clientaddperm", {
      cldbid: requireId(clientDbId, "缺少用户 ID", "permission.client.add"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.client.add"),
      permvalue: value,
      permskip: toNumber(skip),
    });
  },
  async removeClientPermission({ clientDbId, permissionId }) {
    return TeamSpeak.execute("clientdelperm", {
      cldbid: requireId(clientDbId, "缺少用户 ID", "permission.client.remove"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.client.remove"),
    });
  },

  async listChannelPermissions(channelId) {
    return TeamSpeak.execute("channelpermlist", {
      cid: requireId(channelId, "缺少频道 ID", "permission.channel.list"),
    });
  },
  async addChannelPermission({ channelId, permissionId, value }) {
    return TeamSpeak.execute("channeladdperm", {
      cid: requireId(channelId, "缺少频道 ID", "permission.channel.add"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.channel.add"),
      permvalue: value,
    });
  },
  async removeChannelPermission({ channelId, permissionId }) {
    return TeamSpeak.execute("channeldelperm", {
      cid: requireId(channelId, "缺少频道 ID", "permission.channel.remove"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.channel.remove"),
    });
  },

  async listChannelClientPermissions({ channelId, clientDbId }) {
    return TeamSpeak.execute("channelclientpermlist", {
      cid: requireId(channelId, "缺少频道 ID", "permission.channelclient.list"),
      cldbid: requireId(clientDbId, "缺少用户 ID", "permission.channelclient.list"),
    });
  },
  async addChannelClientPermission({ channelId, clientDbId, permissionId, value }) {
    return TeamSpeak.execute("channelclientaddperm", {
      cid: requireId(channelId, "缺少频道 ID", "permission.channelclient.add"),
      cldbid: requireId(clientDbId, "缺少用户 ID", "permission.channelclient.add"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.channelclient.add"),
      permvalue: value,
    });
  },
  async removeChannelClientPermission({ channelId, clientDbId, permissionId }) {
    return TeamSpeak.execute("channelclientdelperm", {
      cid: requireId(channelId, "缺少频道 ID", "permission.channelclient.remove"),
      cldbid: requireId(clientDbId, "缺少用户 ID", "permission.channelclient.remove"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.channelclient.remove"),
    });
  },

  async listChannelGroupPermissions(channelGroupId) {
    return TeamSpeak.execute("channelgrouppermlist", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "permission.channelgroup.list"),
    });
  },
  async addChannelGroupPermission({ channelGroupId, permissionId, value }) {
    return TeamSpeak.execute("channelgroupaddperm", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "permission.channelgroup.add"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.channelgroup.add"),
      permvalue: value,
    });
  },
  async removeChannelGroupPermission({ channelGroupId, permissionId }) {
    return TeamSpeak.execute("channelgroupdelperm", {
      cgid: requireId(channelGroupId, "缺少频道组 ID", "permission.channelgroup.remove"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.channelgroup.remove"),
    });
  },

  async listServerGroupPermissions(serverGroupId) {
    return TeamSpeak.execute("servergrouppermlist", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "permission.servergroup.list"),
    });
  },
  async addServerGroupPermission({ serverGroupId, permissionId, value, skip, negated }) {
    return TeamSpeak.execute("servergroupaddperm", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "permission.servergroup.add"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.servergroup.add"),
      permvalue: value,
      permskip: toNumber(skip),
      permnegated: toNumber(negated),
    });
  },
  async removeServerGroupPermission({ serverGroupId, permissionId }) {
    return TeamSpeak.execute("servergroupdelperm", {
      sgid: requireId(serverGroupId, "缺少服务器组 ID", "permission.servergroup.remove"),
      permid: requireId(permissionId, "缺少权限 ID", "permission.servergroup.remove"),
    });
  },
};
