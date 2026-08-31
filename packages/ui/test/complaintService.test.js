import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: { execute: vi.fn() },
}));

import TeamSpeak from "@/api/TeamSpeak";
import complaintService from "@/services/complaintService";
import { ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("complaintService.list", () => {
  it("delegates to complainlist", async () => {
    TeamSpeak.execute.mockResolvedValue([{ tcldbid: "1", fcldbid: "2" }]);

    await expect(complaintService.list()).resolves.toEqual([
      { tcldbid: "1", fcldbid: "2" },
    ]);
    expect(TeamSpeak.execute).toHaveBeenCalledWith("complainlist");
  });
});

describe("complaintService.remove", () => {
  it("maps targetClientDbId/clientDbId to tcldbid/fcldbid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await complaintService.remove({
      targetClientDbId: "1",
      clientDbId: "2",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("complaindel", {
      tcldbid: "1",
      fcldbid: "2",
    });
  });

  it("rejects a missing targetClientDbId", async () => {
    await expect(
      complaintService.remove({ clientDbId: "2" })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("complaintService.removeAllForClient", () => {
  it("removes every complaint that targets the given client", async () => {
    TeamSpeak.execute
      .mockResolvedValueOnce([
        { tcldbid: "1", fcldbid: "9" },
        { tcldbid: "3", fcldbid: "8" },
        { tcldbid: "1", fcldbid: "7" },
      ])
      .mockResolvedValue([]);

    await complaintService.removeAllForClient("1");

    expect(TeamSpeak.execute).toHaveBeenNthCalledWith(1, "complainlist");
    expect(TeamSpeak.execute).toHaveBeenNthCalledWith(2, "complaindel", {
      tcldbid: "1",
      fcldbid: "9",
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalledWith("complaindel", {
      tcldbid: "3",
      fcldbid: "8",
    });
    expect(TeamSpeak.execute).toHaveBeenNthCalledWith(3, "complaindel", {
      tcldbid: "1",
      fcldbid: "7",
    });
  });

  it("rejects a missing client id", async () => {
    await expect(complaintService.removeAllForClient()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  });
});
