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

function requireTarget(input, operation) {
  const { ip, name, uid } = input;
  if (!ip && !name && !uid) {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少封禁目标（IP / 名称 / UID）",
      operation,
    });
  }
  return input;
}

/**
 * Ban operations. Components call these business methods and never name raw
 * TeamSpeak commands (banlist/banadd/bandel).
 */
export default {
  async list() {
    return TeamSpeak.getBanList();
  },
  async create({ ip, name, uid, reason, time }) {
    const input = requireTarget({ ip, name, uid }, "ban.create");
    return TeamSpeak.execute("banadd", {
      ip: input.ip,
      name: input.name,
      uid: input.uid,
      banreason: reason,
      time,
    });
  },
  async remove(banId) {
    return TeamSpeak.execute("bandel", {
      banid: requireId(banId, "缺少封禁 ID", "ban.remove"),
    });
  },
  /**
   * Update a ban: TeamSpeak has no ban-edit command, so we add a fresh ban and
   * delete the old one (keeps the existing component behaviour).
   */
  async update(input) {
    await this.create(input);
    await this.remove(input.banId);
  },
  async createFromClient({ ip, name, uid, reason, time }) {
    return this.create({ ip, name, uid, reason, time });
  },
};
