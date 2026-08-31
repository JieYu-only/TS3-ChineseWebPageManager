import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

function isEmptyContent(content) {
  if (!content) return true;
  if (content instanceof Blob) return content.size === 0;
  return false;
}

/**
 * Snapshot (server configuration backup) operations. Components call these
 * business methods and never name raw TeamSpeak commands. Snapshot content is
 * streamed through the dedicated file-transfer path and is never logged.
 */
export default {
  create() {
    return TeamSpeak.createSnapshot();
  },
  async restore(content) {
    if (isEmptyContent(content)) {
      throw new ServiceError({
        code: ERROR_CODES.INVALID_ARGUMENT,
        message: "快照内容为空",
        operation: "snapshot.restore",
      });
    }
    return TeamSpeak.deploySnapshot(content);
  },
};
