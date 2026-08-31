import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));

import TeamSpeak from "@/api/TeamSpeak";
import logService from "@/services/logService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logService.list", () => {
  it("maps instance/reverse/lines/beginPos to logview", async () => {
    TeamSpeak.execute.mockResolvedValue([{ l: "log", lastPos: 1 }]);

    await logService.list({
      instance: 0,
      reverse: 1,
      lines: 100,
      beginPosition: 5,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("logview", {
      instance: 0,
      reverse: 1,
      lines: 100,
      beginPos: 5,
    });
  });

  it("omits beginPos when no beginPosition is given", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await logService.list({ lines: 100 });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("logview", {
      instance: 0,
      reverse: 1,
      lines: 100,
    });
  });

  it("rejects a non-positive line count without sending", async () => {
    await expect(logService.list({ lines: 0 })).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("logService error propagation", () => {
  it("propagates PERMISSION_DENIED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "log.list",
      })
    );

    await expect(logService.list({ lines: 100 })).rejects.toMatchObject({
      code: ERROR_CODES.PERMISSION_DENIED,
    });
  });
});
