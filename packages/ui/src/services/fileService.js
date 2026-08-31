import axios from "axios";
import TeamSpeak from "@/api/TeamSpeak";
import { ServiceError, ERROR_CODES } from "@/transport/transportError";
import {
  getUploadUrl,
  getDownloadUrl,
  initFileUpload,
  initFileDownload,
} from "@/api/fileTransfer";

function requirePath(name, operation) {
  if (typeof name !== "string" || name === "") {
    throw new ServiceError({
      code: ERROR_CODES.INVALID_ARGUMENT,
      message: "缺少路径",
      operation,
    });
  }
  return name;
}

const MAX_CONCURRENT_TRANSFERS = 2;
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

let pending = 0;
let resolveNext = [];

function acquireSlot() {
  if (pending < MAX_CONCURRENT_TRANSFERS) {
    pending += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => resolveNext.push(resolve));
}

function releaseSlot() {
  pending -= 1;
  const next = resolveNext.shift();
  if (next) next();
}

const activeTransfers = new Map(); // transferId -> AbortController
const currentSignal = { value: undefined };

function normalizeTransferError(err, operation) {
  if (axios.isCancel(err)) {
    return new ServiceError({
      code: ERROR_CODES.REQUEST_CANCELLED,
      message: "传输已取消",
      operation,
    });
  }
  if (err instanceof ServiceError) return err;

  const codeMap = {
    ECONNABORTED: ERROR_CODES.REQUEST_TIMEOUT,
    ETIMEDOUT: ERROR_CODES.REQUEST_TIMEOUT,
  };

  let code = ERROR_CODES.TRANSFER_FAILED;
  if (err && err.code && codeMap[err.code]) code = codeMap[err.code];
  if (err && err.response && err.response.status === 401) code = ERROR_CODES.AUTH_REQUIRED;
  if (err && err.response && err.response.status === 413) code = ERROR_CODES.FILE_TOO_LARGE;

  return new ServiceError({
    code,
    message: err && err.message ? err.message : "文件传输失败",
    operation,
    cause: err,
  });
}

function httpStream({
  url,
  data,
  onProgress,
  sendedBytes = 0,
  signal,
  timeout = DEFAULT_TIMEOUT,
}) {
  return axios({
    method: "POST",
    url,
    withCredentials: true,
    data,
    signal,
    timeout,
    onUploadProgress: (e) => {
      if (onProgress) {
        const total = e.total + sendedBytes;
        const loaded = e.loaded + sendedBytes;
        onProgress(total ? (loaded / total) * 100 : 0);
      }
    },
    onDownloadProgress: (e) => {
      if (onProgress) {
        onProgress(e.total ? (e.loaded / e.total) * 100 : 0);
      }
    },
  });
}

/**
 * File operations and file transfer orchestration. Components call these
 * business methods and never name raw TeamSpeak commands (ftgetfilelist/
 * ftcreatedir/ftrenamefile/ftdeletefile/ftgetfileinfo). Raw command strings and
 * HTTP transport details live here and in the protocol layer, never in a
 * component.
 */
export default {
  async list({ channelId, path = "/", channelPassword = "" }) {
    return TeamSpeak.execute("ftgetfilelist", {
      cid: channelId,
      cpw: channelPassword,
      path,
    });
  },
  async getInfo({ channelId, name, channelPassword = "" }) {
    return TeamSpeak.execute("ftgetfileinfo", {
      cid: channelId,
      name: requirePath(name, "file.info"),
      cpw: channelPassword,
    }).then((res) => res[0]);
  },
  async downloadFileData({ name, channelId = 0, channelPassword = "" }) {
    return TeamSpeak.downloadFile(
      requirePath(name, "file.downloadFileData"),
      channelId,
      channelPassword
    );
  },
  async createDirectory({ channelId, dirname, channelPassword = "" }) {
    return TeamSpeak.execute("ftcreatedir", {
      cid: channelId,
      cpw: channelPassword,
      dirname: requirePath(dirname, "file.createDirectory"),
    });
  },
  async rename({ channelId, oldName, newName, channelPassword = "" }) {
    return TeamSpeak.execute("ftrenamefile", {
      cid: channelId,
      cpw: channelPassword,
      oldname: requirePath(oldName, "file.rename"),
      newname: requirePath(newName, "file.rename"),
    });
  },
  async remove({ channelId, name, channelPassword = "" }) {
    return TeamSpeak.execute("ftdeletefile", {
      cid: channelId,
      cpw: channelPassword,
      name: requirePath(name, "file.remove"),
    });
  },
  initUpload({ cid, path, size, cpw = "", overwrite = 1, resume = 0 }) {
    return initFileUpload({ cid, path, size, cpw, overwrite, resume });
  },
  initDownload({ cid, path, cpw = "", seekpos = 0 }) {
    return initFileDownload({ cid, path, cpw, seekpos });
  },
  getUploadUrl(ticket) {
    return getUploadUrl(ticket);
  },
  getDownloadUrl(ticket) {
    return getDownloadUrl(ticket);
  },
  upload({ blob, ticket, transferId, sendedBytes = 0, onProgress, signal, timeout }) {
    return this._runTransfer({
      transferId,
      signal,
      task: async (controller) => {
        const formData = new FormData();
        formData.append("file", blob, blob.name);
        return httpStream({
          url: getUploadUrl(ticket),
          data: formData,
          onProgress,
          sendedBytes,
          signal: controller.signal,
          timeout,
        });
      },
    });
  },
  download({ ticket, transferId, onProgress, signal, timeout }) {
    return this._runTransfer({
      transferId,
      signal,
      task: async (controller) => {
        return httpStream({
          url: getDownloadUrl(ticket),
          data: {},
          onProgress,
          signal: controller.signal,
          timeout,
        });
      },
    });
  },
  cancel(transferId) {
    const controller = activeTransfers.get(transferId);
    if (controller) controller.abort();
  },

  /**
   * Run a transfer with a concurrency slot, cancellation and a same-transfer
   * external AbortSignal. Always releases the slot and removes the registered
   * controller (resource release + post-failure cleanup).
   */
  async _runTransfer({ transferId, signal, task }) {
    await acquireSlot();
    const controller = new AbortController();
    activeTransfers.set(transferId, controller);

    const abort = () => controller.abort();
    currentSignal.value = controller.signal;

    if (signal) {
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort);
    }

    try {
      const result = await task(controller);
      return result;
    } catch (err) {
      throw normalizeTransferError(err, "file.transfer");
    } finally {
      if (signal) signal.removeEventListener("abort", abort);
      activeTransfers.delete(transferId);
      currentSignal.value = undefined;
      releaseSlot();
    }
  },
};
