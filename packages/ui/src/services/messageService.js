import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";
import clientService from "@/services/clientService";
import channelService from "@/services/channelService";
import serverService from "@/services/serverService";

function requireText(text, operation) {
  if (typeof text !== "string" || text === "") {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少消息内容",
      operation,
    });
  }
  return text;
}

/**
 * Text-message operations. The component never calls `$TeamSpeak.execute`:
 * send* map to sendtextmessage with the right target mode, and the data queries
 * delegate to the client / channel / server services. Realtime subscription
 * helpers stay in `eventService`.
 */
export default {
  listClients() {
    return clientService.listOnline();
  },
  listChannels() {
    return channelService.list();
  },
  getCurrentClient() {
    return serverService.whoAmI();
  },
  getServerInfo() {
    return serverService.info();
  },
  moveCurrentClient({ clientId, channelId }) {
    return clientService.moveToChannel({ clientId, channelId });
  },
  async sendToClient({ target, text }) {
    return TeamSpeak.execute("sendtextmessage", {
      targetmode: 1,
      target,
      msg: requireText(text, "message.sendToClient"),
    });
  },
  async sendToChannel({ target, text }) {
    return TeamSpeak.execute("sendtextmessage", {
      targetmode: 2,
      target,
      msg: requireText(text, "message.sendToChannel"),
    });
  },
  async sendToServer({ target, text }) {
    return TeamSpeak.execute("sendtextmessage", {
      targetmode: 3,
      target,
      msg: requireText(text, "message.sendToServer"),
    });
  },
};
