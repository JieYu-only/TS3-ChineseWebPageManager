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
 * API-key operations. Components call these business methods and never name raw
 * TeamSpeak commands (apikeylist/apikeyadd/apikeydel).
 */
export default {
  async list({ clientDbId = "*" } = {}) {
    return TeamSpeak.execute("apikeylist", { cldbid: clientDbId });
  },
  async create({ scope, clientDbId, lifetime }) {
    const params = {
      scope: requireId(scope, "缺少作用范围", "apikey.create"),
    };
    if (clientDbId) params.cldbid = clientDbId;
    if (lifetime) params.lifetime = lifetime;

    const [result] = await TeamSpeak.execute("apikeyadd", params);
    return result.apikey;
  },
  async remove(apiKeyId) {
    return TeamSpeak.execute("apikeydel", {
      id: requireId(apiKeyId, "缺少 API 密钥 ID", "apikey.remove"),
    });
  },
};
