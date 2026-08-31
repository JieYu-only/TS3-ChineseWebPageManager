import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    execute: vi.fn(),
    downloadFile: vi.fn(),
  },
}));
vi.mock("@/services/clientService", () => ({
  default: { dbInfo: vi.fn() },
}));
vi.mock("@/services/fileService", () => ({
  default: {
    getInfo: vi.fn(),
    downloadFileData: vi.fn(),
  },
}));
vi.mock("@/notify", () => ({ default: { error: vi.fn() } }));
vi.mock("localforage", () => ({
  default: {
    INDEXEDDB: "indexeddb",
    createInstance: vi.fn(() => ({
      iterate: vi.fn(() => Promise.resolve()),
      setItem: vi.fn(() => Promise.resolve()),
      removeItem: vi.fn(() => Promise.resolve()),
    })),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import clientService from "@/services/clientService";
import fileService from "@/services/fileService";
import avatars from "@/store/modules/avatars";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("avatars module delegation (no direct TeamSpeak)", () => {
  it("getClientDbInfo delegates to clientService.dbInfo", async () => {
    clientService.dbInfo.mockResolvedValue({
      cldbid: "5",
      clientFlagAvatar: true,
    });

    await expect(
      avatars.actions.getClientDbInfo({}, "5")
    ).resolves.toEqual({ cldbid: "5", clientFlagAvatar: true });
    expect(clientService.dbInfo).toHaveBeenCalledWith("5");
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("getAvatarFileInfo delegates to fileService.getInfo with the default channel", async () => {
    fileService.getInfo.mockResolvedValue({ name: "/avatar_x", datetime: 1 });

    await expect(
      avatars.actions.getAvatarFileInfo({}, "/avatar_x")
    ).resolves.toEqual({ name: "/avatar_x", datetime: 1 });
    expect(fileService.getInfo).toHaveBeenCalledWith({
      channelId: 0,
      name: "/avatar_x",
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("getClientAvatars downloads and saves avatar data via services", async () => {
    const state = { files: [] };
    const dispatch = vi.fn((name, payload) => {
      switch (name) {
        case "initState":
          return Promise.resolve();
        case "getClientDbInfo":
          return clientService.dbInfo(payload);
        case "getAvatarFileInfo":
          return fileService.getInfo({ channelId: 0, name: payload });
        case "removeAvatar":
          return Promise.resolve();
        case "saveAvatar":
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    });
    const context = { state, dispatch, commit: vi.fn() };

    clientService.dbInfo.mockResolvedValue({
      cldbid: "5",
      clientFlagAvatar: true,
      clientBase64HashClientUID: "x",
    });
    fileService.getInfo.mockResolvedValue({ name: "/avatar_x", datetime: 100 });
    fileService.downloadFileData.mockResolvedValue("base64data");

    await avatars.actions.getClientAvatars(context, ["1", "5"]);

    expect(clientService.dbInfo).toHaveBeenCalledWith("5");
    expect(fileService.getInfo).toHaveBeenCalledWith({
      channelId: 0,
      name: "/avatar_x",
    });
    expect(fileService.downloadFileData).toHaveBeenCalledWith({
      name: "/avatar_x",
      channelId: 0,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
    expect(TeamSpeak.downloadFile).not.toHaveBeenCalled();
  });

  it("skips the serveradmin (clientDbId 1) and never touches TeamSpeak", async () => {
    const dispatch = vi.fn((name) => {
      if (name === "initState") return Promise.resolve();
      return Promise.resolve();
    });
    const context = { state: { files: [] }, dispatch, commit: vi.fn() };

    await avatars.actions.getClientAvatars(context, ["1"]);

    expect(clientService.dbInfo).not.toHaveBeenCalled();
    expect(fileService.downloadFileData).not.toHaveBeenCalled();
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});
