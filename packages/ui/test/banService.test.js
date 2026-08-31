import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    getBanList: vi.fn(),
    execute: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import banService from "@/services/banService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("banService.list", () => {
  it("delegates to getBanList", async () => {
    TeamSpeak.getBanList.mockResolvedValue([{ banid: "1", ip: "1.2.3.4" }]);

    await expect(banService.list()).resolves.toEqual([{ banid: "1", ip: "1.2.3.4" }]);
    expect(TeamSpeak.getBanList).toHaveBeenCalled();
  });
});

describe("banService.create", () => {
  it("maps ip/name/uid/banreason/time to banadd", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await banService.create({
      ip: "1.2.3.4",
      name: "n",
      uid: "u",
      reason: "spam",
      time: 86400,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("banadd", {
      ip: "1.2.3.4",
      name: "n",
      uid: "u",
      banreason: "spam",
      time: 86400,
    });
  });

  it("rejects a ban with no ip/name/uid", async () => {
    await expect(
      banService.create({ reason: "x", time: 60 })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("banService.remove", () => {
  it("maps banid to bandel", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await banService.remove("9");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("bandel", { banid: "9" });
  });

  it("rejects a missing banid", async () => {
    await expect(banService.remove("")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("banService.update", () => {
  it("creates a fresh ban and deletes the old one", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await banService.update({
      banId: "9",
      ip: "1.2.3.4",
      name: "n",
      uid: "u",
      reason: "x",
      time: 86400,
    });

    expect(TeamSpeak.execute).toHaveBeenNthCalledWith(1, "banadd", {
      ip: "1.2.3.4",
      name: "n",
      uid: "u",
      banreason: "x",
      time: 86400,
    });
    expect(TeamSpeak.execute).toHaveBeenNthCalledWith(2, "bandel", {
      banid: "9",
    });
  });
});

describe("banService.createFromClient", () => {
  it("delegates to create", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await banService.createFromClient({
      ip: "1.2.3.4",
      name: "n",
      uid: "u",
      reason: "spam",
      time: 0,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("banadd", {
      ip: "1.2.3.4",
      name: "n",
      uid: "u",
      banreason: "spam",
      time: 0,
    });
  });
});

describe("banService error propagation", () => {
  it("propagates RESOURCE_NOT_FOUND from a remove", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        operation: "ban.remove",
      })
    );

    await expect(banService.remove("9")).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
    });
  });
});
