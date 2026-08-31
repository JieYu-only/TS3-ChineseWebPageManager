import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    execute: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import permissionService from "@/services/permissionService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("permissionService.listDefinitions", () => {
  it("delegates to permissionlist", async () => {
    TeamSpeak.execute.mockResolvedValue([{ permid: "1", permname: "b_foo" }]);

    await expect(permissionService.listDefinitions()).resolves.toEqual([
      { permid: "1", permname: "b_foo" },
    ]);
    expect(TeamSpeak.execute).toHaveBeenCalledWith("permissionlist");
  });
});

describe("permissionService client permissions", () => {
  it("listClientPermissions maps cldbid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.listClientPermissions("5");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientpermlist", {
      cldbid: "5",
    });
  });

  it("addClientPermission maps cldbid/permid/permvalue/permskip", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.addClientPermission({
      clientDbId: "5",
      permissionId: "7",
      value: 10,
      skip: true,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientaddperm", {
      cldbid: "5",
      permid: "7",
      permvalue: 10,
      permskip: 1,
    });
  });

  it("removeClientPermission maps cldbid/permid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.removeClientPermission({
      clientDbId: "5",
      permissionId: "7",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("clientdelperm", {
      cldbid: "5",
      permid: "7",
    });
  });
});

describe("permissionService channel permissions", () => {
  it("listChannelPermissions maps cid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.listChannelPermissions("3");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelpermlist", {
      cid: "3",
    });
  });

  it("addChannelPermission maps cid/permid/permvalue", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.addChannelPermission({
      channelId: "3",
      permissionId: "7",
      value: 4,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channeladdperm", {
      cid: "3",
      permid: "7",
      permvalue: 4,
    });
  });

  it("removeChannelPermission maps cid/permid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.removeChannelPermission({
      channelId: "3",
      permissionId: "7",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channeldelperm", {
      cid: "3",
      permid: "7",
    });
  });
});

describe("permissionService channel-client permissions", () => {
  it("listChannelClientPermissions maps cid/cldbid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.listChannelClientPermissions({
      channelId: "3",
      clientDbId: "5",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelclientpermlist", {
      cid: "3",
      cldbid: "5",
    });
  });

  it("addChannelClientPermission maps cid/cldbid/permid/permvalue", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.addChannelClientPermission({
      channelId: "3",
      clientDbId: "5",
      permissionId: "7",
      value: 8,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelclientaddperm", {
      cid: "3",
      cldbid: "5",
      permid: "7",
      permvalue: 8,
    });
  });

  it("removeChannelClientPermission maps cid/cldbid/permid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.removeChannelClientPermission({
      channelId: "3",
      clientDbId: "5",
      permissionId: "7",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelclientdelperm", {
      cid: "3",
      cldbid: "5",
      permid: "7",
    });
  });
});

describe("permissionService channel-group permissions", () => {
  it("listChannelGroupPermissions maps cgid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.listChannelGroupPermissions("9");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgrouppermlist", {
      cgid: "9",
    });
  });

  it("addChannelGroupPermission maps cgid/permid/permvalue", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.addChannelGroupPermission({
      channelGroupId: "9",
      permissionId: "7",
      value: 2,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgroupaddperm", {
      cgid: "9",
      permid: "7",
      permvalue: 2,
    });
  });

  it("removeChannelGroupPermission maps cgid/permid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.removeChannelGroupPermission({
      channelGroupId: "9",
      permissionId: "7",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgroupdelperm", {
      cgid: "9",
      permid: "7",
    });
  });
});

describe("permissionService server-group permissions", () => {
  it("listServerGroupPermissions maps sgid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.listServerGroupPermissions("6");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergrouppermlist", {
      sgid: "6",
    });
  });

  it("addServerGroupPermission maps sgid/permid/permvalue and boolean flags", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.addServerGroupPermission({
      serverGroupId: "6",
      permissionId: "7",
      value: 1,
      skip: true,
      negated: false,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupaddperm", {
      sgid: "6",
      permid: "7",
      permvalue: 1,
      permskip: 1,
      permnegated: 0,
    });
  });

  it("removeServerGroupPermission maps sgid/permid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await permissionService.removeServerGroupPermission({
      serverGroupId: "6",
      permissionId: "7",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupdelperm", {
      sgid: "6",
      permid: "7",
    });
  });
});

describe("permissionService invalid arguments", () => {
  it("client list rejects a missing clientDbId without sending", async () => {
    await expect(permissionService.listClientPermissions()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("channel add rejects a missing channelId", async () => {
    await expect(
      permissionService.addChannelPermission({ permissionId: "1", value: 1 })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("server-group add rejects a missing permissionId", async () => {
    await expect(
      permissionService.addServerGroupPermission({ serverGroupId: "6", value: 1 })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("permissionService error propagation", () => {
  it("propagates PERMISSION_DENIED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "permission.client.add",
      })
    );

    await expect(
      permissionService.addClientPermission({
        clientDbId: "5",
        permissionId: "7",
        value: 1,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.PERMISSION_DENIED });
  });

  it("propagates the full ServiceError code", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({ code: ERROR_CODES.SESSION_EXPIRED, operation: "x" })
    );

    await expect(
      permissionService.addChannelPermission({
        channelId: "3",
        permissionId: "7",
        value: 1,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.SESSION_EXPIRED });
  });
});

describe("permissionService empty lists", () => {
  it("returns an empty permission list as-is", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await expect(permissionService.listClientPermissions("5")).resolves.toEqual([]);
    await expect(permissionService.listDefinitions()).resolves.toEqual([]);
  });
});
