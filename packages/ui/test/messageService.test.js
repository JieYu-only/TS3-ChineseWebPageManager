import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));
vi.mock("@/services/clientService", () => ({
  default: {
    listOnline: vi.fn(),
    moveToChannel: vi.fn(),
  },
}));
vi.mock("@/services/channelService", () => ({
  default: { list: vi.fn() },
}));
vi.mock("@/services/serverService", () => ({
  default: {
    whoAmI: vi.fn(),
    info: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import clientService from "@/services/clientService";
import channelService from "@/services/channelService";
import serverService from "@/services/serverService";
import messageService from "@/services/messageService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("messageService data queries", () => {
  it("listClients delegates to clientService", async () => {
    clientService.listOnline.mockResolvedValue([{ clid: "1" }]);

    await expect(messageService.listClients()).resolves.toEqual([{ clid: "1" }]);
  });

  it("listChannels delegates to channelService", async () => {
    channelService.list.mockResolvedValue([{ cid: "2" }]);

    await expect(messageService.listChannels()).resolves.toEqual([{ cid: "2" }]);
  });

  it("getCurrentClient delegates to serverService.whoAmI", async () => {
    serverService.whoAmI.mockResolvedValue({ clientId: "7" });

    await expect(messageService.getCurrentClient()).resolves.toEqual({
      clientId: "7",
    });
  });

  it("getServerInfo delegates to serverService.info", async () => {
    serverService.info.mockResolvedValue({ virtualserverName: "srv" });

    await expect(messageService.getServerInfo()).resolves.toEqual({
      virtualserverName: "srv",
    });
  });

  it("moveCurrentClient delegates to clientService.moveToChannel", async () => {
    clientService.moveToChannel.mockResolvedValue([]);

    await messageService.moveCurrentClient({ clientId: "7", channelId: "3" });

    expect(clientService.moveToChannel).toHaveBeenCalledWith({
      clientId: "7",
      channelId: "3",
    });
  });
});

describe("messageService send", () => {
  it("sendToClient maps targetmode 1", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await messageService.sendToClient({ target: "5", text: "hi" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("sendtextmessage", {
      targetmode: 1,
      target: "5",
      msg: "hi",
    });
  });

  it("sendToChannel maps targetmode 2", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await messageService.sendToChannel({ target: "3", text: "hi" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("sendtextmessage", {
      targetmode: 2,
      target: "3",
      msg: "hi",
    });
  });

  it("sendToServer maps targetmode 3", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await messageService.sendToServer({ target: "1", text: "hi" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("sendtextmessage", {
      targetmode: 3,
      target: "1",
      msg: "hi",
    });
  });

  it("rejects an empty message without sending", async () => {
    await expect(
      messageService.sendToClient({ target: "5", text: "" })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("messageService error propagation", () => {
  it("propagates PERMISSION_DENIED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "message.sendToChannel",
      })
    );

    await expect(
      messageService.sendToChannel({ target: "3", text: "x" })
    ).rejects.toMatchObject({ code: ERROR_CODES.PERMISSION_DENIED });
  });
});
