import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

function requireLines(lines, operation) {
  if (!Number.isInteger(lines) || lines <= 0) {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少日志条数",
      operation,
    });
  }
  return lines;
}

/**
 * Server log operations. Components call these business methods and never name
 * raw TeamSpeak commands (logview).
 */
export default {
  async list({
    instance = 0,
    reverse = 1,
    lines = 100,
    beginPosition,
  } = {}) {
    const params = {
      instance,
      reverse,
      lines: requireLines(lines, "log.list"),
    };
    if (beginPosition !== undefined && beginPosition !== null) {
      params.beginPos = beginPosition;
    }
    return TeamSpeak.execute("logview", params);
  },
};
