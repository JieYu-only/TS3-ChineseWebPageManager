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

/**
 * Permission-key (token) operations. Components call these business methods and
 * never name raw TeamSpeak commands (tokenlist/tokenadd/tokendelete).
 */
export default {
  async list() {
    return TeamSpeak.execute("tokenlist");
  },
  async create({ tokenType, groupId, channelId, description = "" }) {
    if (tokenType !== 0 && tokenType !== 1) {
      throw new ServiceError({
        code: ERROR_CODES.INVALID_ARGUMENT,
        message: "缺少密钥类型",
        operation: "token.create",
      });
    }
    return TeamSpeak.execute("tokenadd", {
      tokentype: tokenType,
      tokenid1: requireId(groupId, "缺少用户组 ID", "token.create"),
      tokenid2: tokenType === 1 ? channelId || 0 : 0,
      tokendescription: description,
    });
  },
  async remove(token) {
    return TeamSpeak.execute("tokendelete", {
      token: requireId(token, "缺少密钥", "token.remove"),
    });
  },
};
