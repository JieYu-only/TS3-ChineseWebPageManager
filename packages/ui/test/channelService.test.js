import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    getChannelList: vi.fn(),
    getServerInfo: vi.fn(),
    execute: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import channelService from "@/services/channelService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("channelService.create", () => {
  it("maps input to channelcreate and resolves the created row", async () => {
    const created = { cid: "9", channelName: "Room" };
    TeamSpeak.execute.mockResolvedValue([created]);

    await channelService.create({ channelName: "Room" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelcreate", {
      channelName: "Room",
    });
  });

  it("propagates a permission-denied ServiceError", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: "没有权限",
        operation: "channel.create",
      })
    );

    await expect(channelService.create({ channelName: "x" })).rejects.toMatchObject({
      code: ERROR_CODES.PERMISSION_DENIED,
    });
  });
});

describe("channelService.edit", () => {
  it("maps channelId -> cid in channeledit", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await channelService.edit({ channelId: "5", channelName: "R" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channeledit", {
      cid: "5",
      channelName: "R",
    });
  });
});

describe("channelService.remove", () => {
  it("maps channelId -> cid and passes force", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await channelService.remove({ channelId: "5", force: 1 });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channeldelete", {
      cid: "5",
      force: 1,
    });
  });

  it("propagates a connection-lost ServiceError", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.CONNECTION_LOST,
        operation: "channel.remove",
      })
    );

    await expect(channelService.remove({ channelId: "5" })).rejects.toMatchObject({
      code: ERROR_CODES.CONNECTION_LOST,
    });
  });
});

describe("channelService.moveClient", () => {
  it("maps clientId/channelId -> clid/cid in clientmove", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await channelService.moveClient({ clientId: "7", channelId: "3" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientmove", {
      clid: "7",
      cid: "3",
    });
  });
});

describe("channelService queries", () => {
  it("list() delegates to getChannelList", async () => {
    TeamSpeak.getChannelList.mockResolvedValue([{ cid: "1" }]);

    await expect(channelService.list()).resolves.toEqual([{ cid: "1" }]);
    expect(TeamSpeak.getChannelList).toHaveBeenCalled();
  });

  it("info() maps cid and returns the first row", async () => {
    TeamSpeak.execute.mockResolvedValue([{ cid: "1", channelName: "x" }]);

    await expect(channelService.info("1")).resolves.toMatchObject({ cid: "1" });
    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelinfo", { cid: "1" });
  });

  it("serverInfo() returns the last serverinfo row", async () => {
    TeamSpeak.getServerInfo.mockResolvedValue([{ a: 1 }, { b: 2 }]);

    await expect(channelService.serverInfo()).resolves.toEqual({ b: 2 });
  });
});
