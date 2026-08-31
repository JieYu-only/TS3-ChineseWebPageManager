import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));

import TeamSpeak from "@/api/TeamSpeak";
import consoleService from "@/services/consoleService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("consoleService.execute", () => {
  it("delegates command/parameters/options to execute", async () => {
    TeamSpeak.execute.mockResolvedValue([{ ok: true }]);

    await consoleService.execute("serverlist", { a: "1" }, ["-l"]);

    expect(TeamSpeak.execute).toHaveBeenCalledWith("serverlist", { a: "1" }, ["-l"]);
  });

  it("uses empty defaults when none are supplied", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await consoleService.execute("version");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("version", {}, []);
  });

  it("rejects an empty command without sending", async () => {
    await expect(consoleService.execute("")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("rejects a non-string command", async () => {
    await expect(consoleService.execute(42)).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("rejects an array parameters", async () => {
    await expect(consoleService.execute("x", [])).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("rejects non-array options", async () => {
    await expect(consoleService.execute("x", {}, "bad")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("consoleService error propagation", () => {
  it("propagates SESSION_EXPIRED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({ code: ERROR_CODES.SESSION_EXPIRED, operation: "console.execute" })
    );

    await expect(consoleService.execute("x")).rejects.toMatchObject({
      code: ERROR_CODES.SESSION_EXPIRED,
    });
  });
});
