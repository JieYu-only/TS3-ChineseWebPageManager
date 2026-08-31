import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));

import TeamSpeak from "@/api/TeamSpeak";
import apikeyService from "@/services/apikeyService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("apikeyService.list", () => {
  it("defaults to all clients (cldbid=*)", async () => {
    TeamSpeak.execute.mockResolvedValue([{ id: "1" }]);

    await apikeyService.list();

    expect(TeamSpeak.execute).toHaveBeenCalledWith("apikeylist", { cldbid: "*" });
  });

  it("accepts a specific clientDbId", async () => {
    TeamSpeak.execute.mockResolvedValue([{ id: "1" }]);

    await apikeyService.list({ clientDbId: "5" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("apikeylist", { cldbid: "5" });
  });
});

describe("apikeyService.create", () => {
  it("maps scope/clientDbId/lifetime and unwraps the returned key", async () => {
    TeamSpeak.execute.mockResolvedValue([{ apikey: "key-1" }]);

    await expect(
      apikeyService.create({
        scope: "write",
        clientDbId: "5",
        lifetime: 30,
      })
    ).resolves.toEqual("key-1");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("apikeyadd", {
      scope: "write",
      cldbid: "5",
      lifetime: 30,
    });
  });

  it("omits cldbid/lifetime when not provided", async () => {
    TeamSpeak.execute.mockResolvedValue([{ apikey: "key-1" }]);

    await apikeyService.create({ scope: "read" });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("apikeyadd", {
      scope: "read",
    });
  });

  it("rejects a missing scope", async () => {
    await expect(apikeyService.create({})).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("apikeyService.remove", () => {
  it("maps the key id", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await apikeyService.remove("9");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("apikeydel", { id: "9" });
  });

  it("rejects a missing id", async () => {
    await expect(apikeyService.remove("")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("apikeyService error propagation", () => {
  it("propagates RESOURCE_CONFLICT on a duplicate", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.RESOURCE_CONFLICT,
        operation: "apikey.create",
      })
    );

    await expect(
      apikeyService.create({ scope: "write" })
    ).rejects.toMatchObject({ code: ERROR_CODES.RESOURCE_CONFLICT });
  });
});
