import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));

import TeamSpeak from "@/api/TeamSpeak";
import tokenService from "@/services/tokenService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tokenService.list", () => {
  it("delegates to tokenlist", async () => {
    TeamSpeak.execute.mockResolvedValue([{ token: "abc" }]);

    await expect(tokenService.list()).resolves.toEqual([{ token: "abc" }]);
    expect(TeamSpeak.execute).toHaveBeenCalledWith("tokenlist");
  });
});

describe("tokenService.create", () => {
  it("creates a server-group token with tokenid2=0", async () => {
    TeamSpeak.execute.mockResolvedValue([{ token: "abc" }]);

    await tokenService.create({
      tokenType: 0,
      groupId: "6",
      description: "desc",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("tokenadd", {
      tokentype: 0,
      tokenid1: "6",
      tokenid2: 0,
      tokendescription: "desc",
    });
  });

  it("creates a channel-group token with the channel id as tokenid2", async () => {
    TeamSpeak.execute.mockResolvedValue([{ token: "abc" }]);

    await tokenService.create({
      tokenType: 1,
      groupId: "8",
      channelId: "3",
      description: "",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("tokenadd", {
      tokentype: 1,
      tokenid1: "8",
      tokenid2: "3",
      tokendescription: "",
    });
  });

  it("falls back tokenid2 to 0 when no channel id is given", async () => {
    TeamSpeak.execute.mockResolvedValue([{ token: "abc" }]);

    await tokenService.create({ tokenType: 1, groupId: "8" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("tokenadd", {
      tokentype: 1,
      tokenid1: "8",
      tokenid2: 0,
      tokendescription: "",
    });
  });

  it("rejects an invalid token type", async () => {
    await expect(
      tokenService.create({ tokenType: 2, groupId: "6" })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("rejects a missing groupId", async () => {
    await expect(
      tokenService.create({ tokenType: 0, groupId: undefined })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("tokenService.remove", () => {
  it("maps the token string", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await tokenService.remove("abc");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("tokendelete", {
      token: "abc",
    });
  });

  it("rejects a missing token", async () => {
    await expect(tokenService.remove("")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("tokenService error propagation", () => {
  it("propagates PERMISSION_DENIED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "token.create",
      })
    );

    await expect(
      tokenService.create({ tokenType: 0, groupId: "6" })
    ).rejects.toMatchObject({ code: ERROR_CODES.PERMISSION_DENIED });
  });
});
