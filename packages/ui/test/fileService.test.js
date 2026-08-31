import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));

vi.mock("@/api/fileTransfer", () => ({
  getUploadUrl: vi.fn((t) => `/uploads/${t}`),
  getDownloadUrl: vi.fn((t) => `/downloads/${t}`),
  initFileUpload: vi.fn(() => Promise.resolve({ ticket: "up" })),
  initFileDownload: vi.fn(() => Promise.resolve({ ticket: "down" })),
}));

vi.mock("axios", () => {
  const axios = vi.fn((config) => {
    return new Promise((resolve) => {
      if (config.onUploadProgress) {
        config.onUploadProgress({ loaded: 50, total: 100 });
      }
      resolve({ data: {}, status: 200 });
    });
  });
  axios.isCancel = vi.fn((err) => err && err.name === "CanceledError");
  return { default: axios };
});

import axios from "axios";
import TeamSpeak from "@/api/TeamSpeak";
import {
  getUploadUrl as getUploadUrlApi,
  getDownloadUrl as getDownloadUrlApi,
  initFileUpload,
  initFileDownload,
} from "@/api/fileTransfer";
import fileService from "@/services/fileService";
import { ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fileService command mappings", () => {
  it("list maps cid/path", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await fileService.list({ channelId: "1", path: "/a" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("ftgetfilelist", {
      cid: "1",
      cpw: "",
      path: "/a",
    });
  });

  it("createDirectory maps cid/dirname", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await fileService.createDirectory({ channelId: "1", dirname: "/a/new" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("ftcreatedir", {
      cid: "1",
      cpw: "",
      dirname: "/a/new",
    });
  });

  it("rename maps cid/oldname/newname", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await fileService.rename({
      channelId: "1",
      oldName: "/a/b.txt",
      newName: "/a/c.txt",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("ftrenamefile", {
      cid: "1",
      cpw: "",
      oldname: "/a/b.txt",
      newname: "/a/c.txt",
    });
  });

  it("remove maps cid/name", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await fileService.remove({ channelId: "1", name: "/a/b.txt" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("ftdeletefile", {
      cid: "1",
      cpw: "",
      name: "/a/b.txt",
    });
  });

  it("getInfo maps cid/name and unwraps the first row", async () => {
    TeamSpeak.execute.mockResolvedValue([{ size: 10 }]);

    await expect(
      fileService.getInfo({ channelId: "1", name: "/a/b.txt" })
    ).resolves.toEqual({ size: 10 });
    expect(TeamSpeak.execute).toHaveBeenCalledWith("ftgetfileinfo", {
      cid: "1",
      name: "/a/b.txt",
      cpw: "",
    });
  });
});

describe("fileService invalid arguments", () => {
  it("remove rejects an empty name without sending", async () => {
    await expect(
      fileService.remove({ channelId: "1", name: "" })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("rename rejects a missing newName", async () => {
    await expect(
      fileService.rename({ channelId: "1", oldName: "/a", newName: "" })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("fileService transfer setup", () => {
  it("initUpload delegates to the file-transfer api", async () => {
    await fileService.initUpload({
      cid: "1",
      path: "/a",
      size: 10,
      overwrite: 1,
      resume: 0,
    });

    expect(initFileUpload).toHaveBeenCalledWith({
      cid: "1",
      path: "/a",
      size: 10,
      cpw: "",
      overwrite: 1,
      resume: 0,
    });
  });

  it("initDownload delegates to the file-transfer api", async () => {
    await fileService.initDownload({ cid: "1", path: "/a", seekpos: 0 });

    expect(initFileDownload).toHaveBeenCalledWith({
      cid: "1",
      path: "/a",
      cpw: "",
      seekpos: 0,
    });
  });

  it("getUploadUrl/getDownloadUrl expose the ticket urls", () => {
    expect(fileService.getUploadUrl("t1")).toBe("/uploads/t1");
    expect(fileService.getDownloadUrl("t1")).toBe("/downloads/t1");
    expect(getUploadUrlApi).toHaveBeenCalledWith("t1");
    expect(getDownloadUrlApi).toHaveBeenCalledWith("t1");
  });
});

describe("fileService upload", () => {
  it("streams the blob with progress and passes the upload url", async () => {
    const onProgress = vi.fn();
    const blob = new File(["content"], "x.txt");

    await fileService.upload({ blob, ticket: "t1", transferId: "f1", onProgress });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "/uploads/t1",
        withCredentials: true,
      })
    );
    expect(onProgress).toHaveBeenCalled();
  });

  it("maps a server rejection to FILE_TOO_LARGE", async () => {
    axios.mockRejectedValueOnce({ response: { status: 413 }, message: "too big" });

    await expect(
      fileService.upload({
        blob: new File(["x"], "x.txt"),
        ticket: "t1",
        transferId: "f1",
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.FILE_TOO_LARGE });
  });

  it("cancels a transfer in flight with REQUEST_CANCELLED", async () => {
    axios.mockImplementationOnce(
      (config) =>
        new Promise((resolve, reject) => {
          config.signal.addEventListener("abort", () => {
            const err = new Error("canceled");
            err.name = "CanceledError";
            reject(err);
          });
        })
    );

    const promise = fileService.upload({
      blob: new File(["x"], "x.txt"),
      ticket: "t1",
      transferId: "f1",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    fileService.cancel("f1");

    await expect(promise).rejects.toMatchObject({
      code: ERROR_CODES.REQUEST_CANCELLED,
    });
  });
});
