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
 * Complaint operations. Components call these business methods and never name
 * raw TeamSpeak commands (complainlist/complaindel).
 */
export default {
  async list() {
    return TeamSpeak.execute("complainlist");
  },
  async remove({ targetClientDbId, clientDbId }) {
    return TeamSpeak.execute("complaindel", {
      tcldbid: requireId(targetClientDbId, "缺少被投诉用户 ID", "complaint.remove"),
      fcldbid: requireId(clientDbId, "缺少投诉人 ID", "complaint.remove"),
    });
  },
  async removeAllForClient(clientDbId) {
    requireId(clientDbId, "缺少用户 ID", "complaint.removeAll");
    const list = await this.list();
    for (const complaint of list) {
      if (String(complaint.tcldbid) === String(clientDbId)) {
        await this.remove({
          targetClientDbId: complaint.tcldbid,
          clientDbId: complaint.fcldbid,
        });
      }
    }
  },
};
