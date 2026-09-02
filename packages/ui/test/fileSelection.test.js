import { describe, it, expect } from "vitest";
import { getRemoveList } from "@/components/fileSelection";

// Tree node shapes match FileBrowser's channel roots and getFileList output.
const channel = { id: "channel-1", name: "欢迎大厅", cid: 1 };
const folder = {
  id: "folder@0",
  pid: "channel-1",
  name: "downloads",
  path: "/",
  cid: 1,
  type: 0,
};
const innerFile = {
  id: "readme.txt@123",
  pid: "folder@0",
  name: "readme.txt",
  path: "/downloads",
  cid: 1,
  type: 1,
};
const channelFile = {
  id: "root.txt@456",
  pid: "channel-1",
  name: "root.txt",
  path: "/",
  cid: 1,
  type: 1,
};

describe("getRemoveList", () => {
  it("keeps a single file unchanged", () => {
    expect(getRemoveList([innerFile])).toEqual([innerFile]);
  });

  it("drops a child file when its parent folder is also selected", () => {
    expect(getRemoveList([folder, innerFile])).toEqual([folder]);
  });

  it("drops a channel file when the channel root is also selected", () => {
    expect(getRemoveList([channel, channelFile])).toEqual([channel]);
  });

  it("keeps two unrelated nodes", () => {
    expect(getRemoveList([folder, innerFile, channelFile])).toEqual([
      folder,
      channelFile,
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [folder, innerFile];
    const copy = [...input];
    getRemoveList(input);
    expect(input).toEqual(copy);
  });
});
