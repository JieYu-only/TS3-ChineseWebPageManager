import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    getClientList: vi.fn(),
    fullClientDBList: vi.fn(),
    execute: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import clientService from "@/services/clientService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clientService.listOnline / listDatabase", () => {
  it("listOnline delegates to getClientList", async () => {
    TeamSpeak.getClientList.mockResolvedValue([{ clid: "1" }]);

    await expect(clientService.listOnline()).resolves.toEqual([{ clid: "1" }]);
    expect(TeamSpeak.getClientList).toHaveBeenCalled();
  });

  it("listDatabase delegates to fullClientDBList", async () => {
    TeamSpeak.fullClientDBList.mockResolvedValue([{ cldbid: "5" }]);

    await expect(clientService.listDatabase()).resolves.toEqual([{ cldbid: "5" }]);
    expect(TeamSpeak.fullClientDBList).toHaveBeenCalled();
  });
});

describe("clientService.info / dbInfo", () => {
  it("info maps clid and returns the first row", async () => {
    TeamSpeak.execute.mockResolvedValue([{ clid: "2", clientNickname: "n" }]);

    await expect(clientService.info("2")).resolves.toMatchObject({ clid: "2" });
    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientinfo", { clid: "2" });
  });

  it("dbInfo maps cldbid and returns the first row", async () => {
    TeamSpeak.execute.mockResolvedValue([{ cldbid: "5", clientLastip: "1.2.3.4" }]);

    await expect(clientService.dbInfo("5")).resolves.toMatchObject({
      cldbid: "5",
    });
    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientdbinfo", { cldbid: "5" });
  });
});

describe("clientService.remove / edit", () => {
  it("remove maps cldbid in clientdbdelete", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await clientService.remove("5");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientdbdelete", {
      cldbid: "5",
    });
  });

  it("edit maps clid and spreads props in clientedit", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await clientService.edit("2", { clientDescription: "hello" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientedit", {
      clid: "2",
      clientDescription: "hello",
    });
  });
});

describe("clientService.moveToChannel", () => {
  it("maps clientId/channelId -> clid/cid in clientmove", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await clientService.moveToChannel({ clientId: "7", channelId: "3" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientmove", {
      clid: "7",
      cid: "3",
    });
  });
});

describe("clientService.kick / poke", () => {
  it("kick maps reasonid/reasonmsg/clid in clientkick", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await clientService.kick({
      clientId: "2",
      reasonId: 5,
      reasonMessage: "bye",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientkick", {
      clid: "2",
      reasonid: 5,
      reasonmsg: "bye",
    });
  });

  it("poke maps msg/clid in clientpoke", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await clientService.poke({ clientId: "2", message: "hi" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientpoke", {
      clid: "2",
      msg: "hi",
    });
  });
});
