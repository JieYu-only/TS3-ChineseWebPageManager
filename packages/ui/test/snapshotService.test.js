import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    createSnapshot: vi.fn(),
    deploySnapshot: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import snapshotService from "@/services/snapshotService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("snapshotService.create", () => {
  it("delegates to createSnapshot", async () => {
    TeamSpeak.createSnapshot.mockResolvedValue([{ data: "base64data" }]);

    await expect(snapshotService.create()).resolves.toEqual([{ data: "base64data" }]);
    expect(TeamSpeak.createSnapshot).toHaveBeenCalled();
  });
});

describe("snapshotService.restore", () => {
  it("delegates to deploySnapshot with the content", async () => {
    TeamSpeak.deploySnapshot.mockResolvedValue([]);
    const content = new Blob(["data"]);

    await snapshotService.restore(content);

    expect(TeamSpeak.deploySnapshot).toHaveBeenCalledWith(content);
  });

  it("rejects an empty snapshot without sending", async () => {
    await expect(
      snapshotService.restore(new Blob([]))
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.deploySnapshot).not.toHaveBeenCalled();
  });

  it("rejects a missing content", async () => {
    await expect(snapshotService.restore()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.deploySnapshot).not.toHaveBeenCalled();
  });
});

describe("snapshotService error propagation", () => {
  it("propagates PERMISSION_DENIED on restore", async () => {
    TeamSpeak.deploySnapshot.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "snapshot.restore",
      })
    );

    await expect(
      snapshotService.restore(new Blob(["data"]))
    ).rejects.toMatchObject({ code: ERROR_CODES.PERMISSION_DENIED });
  });
});
