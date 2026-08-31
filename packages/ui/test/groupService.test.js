import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/TeamSpeak", () => ({
  default: {
    getServerGroupList: vi.fn(),
    getChannelGroupList: vi.fn(),
    getServerInfo: vi.fn(),
    execute: vi.fn(),
  },
}));

import TeamSpeak from "@/api/TeamSpeak";
import groupService from "@/services/groupService";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("groupService lists", () => {
  it("listServerGroups delegates to getServerGroupList", async () => {
    TeamSpeak.getServerGroupList.mockResolvedValue([{ sgid: "1", name: "g" }]);

    await expect(groupService.listServerGroups()).resolves.toEqual([
      { sgid: "1", name: "g" },
    ]);
  });

  it("listChannelGroups delegates to getChannelGroupList", async () => {
    TeamSpeak.getChannelGroupList.mockResolvedValue([{ cgid: "2", name: "c" }]);

    await expect(groupService.listChannelGroups()).resolves.toEqual([
      { cgid: "2", name: "c" },
    ]);
  });
});

describe("groupService default groups", () => {
  it("defaultServerGroupId reads virtualserverDefaultServerGroup", async () => {
    TeamSpeak.getServerInfo.mockResolvedValue([
      { virtualserverDefaultServerGroup: "15" },
    ]);

    await expect(groupService.defaultServerGroupId()).resolves.toEqual("15");
  });

  it("defaultChannelGroupId reads virtualserverDefaultChannelGroup", async () => {
    TeamSpeak.getServerInfo.mockResolvedValue([
      { virtualserverDefaultChannelGroup: "8" },
    ]);

    await expect(groupService.defaultChannelGroupId()).resolves.toEqual("8");
  });
});

describe("groupService server-group CRUD", () => {
  it("createServerGroup maps name/type in servergroupadd", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.createServerGroup({ name: "Admins", type: 1 });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupadd", {
      name: "Admins",
      type: 1,
    });
  });

  it("renameServerGroup maps sgid/name in servergrouprename", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.renameServerGroup({
      serverGroupId: "6",
      name: "New",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergrouprename", {
      sgid: "6",
      name: "New",
    });
  });

  it("copyServerGroup maps ssgid/tsgid/name/type in servergroupcopy", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.copyServerGroup({
      sourceGroupId: "6",
      targetGroupId: "9",
      name: "Copy",
      type: 1,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupcopy", {
      ssgid: "6",
      tsgid: "9",
      name: "Copy",
      type: 1,
    });
  });

  it("copyServerGroup uses 0 as target when no target group is given", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.copyServerGroup({
      sourceGroupId: "6",
      targetGroupId: 0,
      name: "Copy",
      type: 1,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupcopy", {
      ssgid: "6",
      tsgid: 0,
      name: "Copy",
      type: 1,
    });
  });

  it("removeServerGroup maps sgid/force (boolean to number)", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.removeServerGroup({ serverGroupId: "6", force: true });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupdel", {
      sgid: "6",
      force: 1,
    });
  });
});

describe("groupService server-group client memberships", () => {
  it("listServerGroupClients maps sgid", async () => {
    TeamSpeak.execute.mockResolvedValue([{ cldbid: "5" }]);

    await groupService.listServerGroupClients("6");

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupclientlist", {
      sgid: "6",
    });
  });

  it("addClientToServerGroup maps sgid/cldbid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.addClientToServerGroup({
      serverGroupId: "6",
      clientDbId: "5",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupaddclient", {
      sgid: "6",
      cldbid: "5",
    });
  });

  it("removeClientFromServerGroup maps sgid/cldbid", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.removeClientFromServerGroup({
      serverGroupId: "6",
      clientDbId: "5",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("servergroupdelclient", {
      sgid: "6",
      cldbid: "5",
    });
  });
});

describe("groupService channel-group CRUD", () => {
  it("createChannelGroup maps name/type in channelgroupadd", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.createChannelGroup({ name: "Guest", type: 0 });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgroupadd", {
      name: "Guest",
      type: 0,
    });
  });

  it("renameChannelGroup maps cgid/name in channelgrouprename", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.renameChannelGroup({
      channelGroupId: "8",
      name: "New",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgrouprename", {
      cgid: "8",
      name: "New",
    });
  });

  it("copyChannelGroup maps scgid/tcgid/name/type in channelgroupcopy", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.copyChannelGroup({
      sourceGroupId: "8",
      targetGroupId: 0,
      name: "Copy",
      type: 0,
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgroupcopy", {
      scgid: "8",
      tcgid: 0,
      name: "Copy",
      type: 0,
    });
  });

  it("removeChannelGroup maps cgid/force", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.removeChannelGroup({ channelGroupId: "8", force: false });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgroupdel", {
      cgid: "8",
      force: 0,
    });
  });
});

describe("groupService channel-group client memberships", () => {
  it("listChannelGroupClients maps cgid/cid", async () => {
    TeamSpeak.execute.mockResolvedValue([{ cldbid: "5" }]);

    await groupService.listChannelGroupClients({
      channelGroupId: "8",
      channelId: "3",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("channelgroupclientlist", {
      cgid: "8",
      cid: "3",
    });
  });

  it("assignClientChannelGroup maps cgid/cid/cldbid in setclientchannelgroup", async () => {
    TeamSpeak.execute.mockResolvedValue([]);

    await groupService.assignClientChannelGroup({
      channelGroupId: "8",
      channelId: "3",
      clientDbId: "5",
    });

    expect(TeamSpeak.execute).toHaveBeenCalledWith("setclientchannelgroup", {
      cgid: "8",
      cid: "3",
      cldbid: "5",
    });
  });
});

describe("groupService invalid arguments", () => {
  it("createServerGroup rejects an empty name without sending", async () => {
    await expect(
      groupService.createServerGroup({ name: "", type: 1 })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("removeServerGroup rejects a missing serverGroupId", async () => {
    await expect(
      groupService.removeServerGroup({ force: true })
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_ARGUMENT });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });

  it("listServerGroupClients rejects a missing serverGroupId", async () => {
    await expect(groupService.listServerGroupClients()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
    expect(TeamSpeak.execute).not.toHaveBeenCalled();
  });
});

describe("groupService error propagation", () => {
  it("propagates PERMISSION_DENIED", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.PERMISSION_DENIED,
        operation: "group.server.remove",
      })
    );

    await expect(
      groupService.removeServerGroup({ serverGroupId: "6" })
    ).rejects.toMatchObject({ code: ERROR_CODES.PERMISSION_DENIED });
  });

  it("propagates RESOURCE_CONFLICT on copy target conflict", async () => {
    TeamSpeak.execute.mockRejectedValue(
      new ServiceError({
        code: ERROR_CODES.RESOURCE_CONFLICT,
        operation: "group.server.copy",
      })
    );

    await expect(
      groupService.copyServerGroup({
        sourceGroupId: "6",
        targetGroupId: "9",
        name: "x",
        type: 1,
      })
    ).rejects.toMatchObject({ code: ERROR_CODES.RESOURCE_CONFLICT });
  });
});
