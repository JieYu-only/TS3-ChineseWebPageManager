import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

/**
 * Console (ServerQuery terminal) operations. This is the one domain that lets a
 * user type raw TeamSpeak commands; the component still does not call
 * `$TeamSpeak.execute` directly. The service validates the command string and
 * rejects empty commands. Sensitive values (passwords/tokens) are never logged
 * here — the response is returned to the caller as-is.
 */
export default {
  async execute(command, parameters = {}, options = []) {
    if (typeof command !== "string" || command === "") {
      throw new ServiceError({
        code: ERROR_CODES.INVALID_ARGUMENT,
        message: "缺少命令",
        operation: "console.execute",
      });
    }
    if (typeof parameters !== "object" || parameters === null || Array.isArray(parameters)) {
      throw new ServiceError({
        code: ERROR_CODES.INVALID_ARGUMENT,
        message: "参数结构无效",
        operation: "console.execute",
      });
    }
    if (!Array.isArray(options)) {
      throw new ServiceError({
        code: ERROR_CODES.INVALID_ARGUMENT,
        message: "选项结构无效",
        operation: "console.execute",
      });
    }
    return TeamSpeak.execute(command, parameters, options);
  },
};
