import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    getServerList: vi.fn(),
    whoAmI: vi.fn(),
    getServerInfo: vi.fn(),
    selectServer: vi.fn(),
    execute: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import serverService from "@/services/serverService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("serverService queries", () => {
  it("list delegates to getServerList", async () => {
    TeamSpeak.getServerList.mockResolvedValue([{ virtualserverId: "1" }]);

    await expect(serverService.list()).resolves.toEqual([{ virtualserverId: "1" }]);
    expect(TeamSpeak.getServerList).toHaveBeenCalled();
  });

  it("whoAmI delegates to whoAmI", async () => {
    TeamSpeak.whoAmI.mockResolvedValue({ clientId: "7" });

    await expect(serverService.whoAmI()).resolves.toEqual({ clientId: "7" });
  });

  it("info unwraps the first serverinfo row", async () => {
    TeamSpeak.getServerInfo.mockResolvedValue([
      { virtualserverName: "srv" },
      { virtualserverName: "srv2" },
    ]);

    await expect(serverService.info()).resolves.toEqual({ virtualserverName: "srv" });
    expect(TeamSpeak.getServerInfo).toHaveBeenCalled();
  });

  it("version unwraps the version string", async () => {
    TeamSpeak.execute.mockResolvedValue([{ version: "3.13.7" }]);

    await expect(serverService.version()).resolves.toEqual("3.13.7");
    expect(TeamSpeak.execute).toHaveBeenCalledWith("version");
  });
});

describe("serverService lifecycle", () => {
  it("create maps input to servercreate and returns the first row", async () => {
    TeamSpeak.execute.mockResolvedValue([{ sid: "1", token: "t" }]);

    await expect(
      serverService.create({ virtualserverName: "srv" })
    ).resolves.toEqual({ sid: "1", token: "t" });
    expect(TeamSpeak.execute).toHaveBeenCalledWith("servercreate", {
      virtualserverName: "srv",
    });
  });

  it("start maps serverId -> sid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await serverService.start("1");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("serverstart", { sid: "1" });
  });

  it("stop maps serverId -> sid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await serverService.stop("1");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("serverstop", { sid: "1" });
  });

  it("remove maps serverId -> sid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await serverService.remove("1");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("serverdelete", { sid: "1" });
  });

  it("select delegates to selectServer", async () => {
    TeamSpeak.selectServer.mockResolvedValue([]);

    await serverService.select("1");

    expect(TeamSpeak.selectServer).toHaveBeenCalledWith("1");
  });

  it("changeName maps to serveredit", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await serverService.changeName({ virtualserverName: "n" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("serveredit", {
      virtualserverName: "n",
    });
  });
});

describe("serverService invalid serverId", () => {
  it("start(undefined) rejects with INVALID_ARGUMENT without sending", async () => {
    await expect(serverService.start()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("stop('') rejects with INVALID_ARGUMENT without sending", async () => {
    await expect(serverService.stop("")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("remove(null) rejects with INVALID_ARGUMENT without sending", async () => {
    await expect(serverService.remove(null)).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("select(undefined) rejects with INVALID_ARGUMENT without selecting", async () => {
    await expect(serverService.select()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.selectServer).not.toHaveBeenCalled();
  });
});

describe("serverService error propagation", () => {
  it("propagates PERMISSION_DENIED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "server.start",
      })
    );

    await expect(serverService.start("1")).rejects.toMatchObject({
      code: ERROR_CODES.PERMISSION_DENIED,
    });
  });
});
