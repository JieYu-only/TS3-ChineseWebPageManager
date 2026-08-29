"use strict";

const express = require("express");
const { Socket } = require("net");
const Busboy = require("busboy");
const path = require("path");
const {
  logger,
  whitelist,
  sanatizer,
  asyncRoute,
  createClientError,
  TicketStore,
} = require("../utils");
const { TeamSpeak } = require("ts3-nodejs-library");
const { sessionManager } = require("../session");

const router = express.Router();

const SESSION_COOKIE = "ts3_session";

// Default single-file ceiling: 2 GiB, so an attacker cannot force unbounded
// memory/disk use with an oversized upload. Operators can lower it via env.
const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Every file-transfer route is behind the server-side session; the session is
 * the only source of the TeamSpeak host. Rejects any call with an invalid or
 * missing session cookie.
 */
router.use((req, res, next) => {
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE];
  const session = sessionManager.get(sessionId);

  if (!session) {
    return next(createClientError("未登录或会话已过期", 401));
  }

  res.locals.session = session;
  return next();
});

const ticketStore = new TicketStore({
  ttlMs: Number(process.env.FILE_TRANSFER_TICKET_TTL_MS) || 45 * 1000,
});

// Per-deployment transfer caps (env-tunable). The defaults are safe: a non-zero
// max file size and finite time/connection limits so slow or continuous traffic
// cannot keep a transfer alive indefinitely.
const transferLimits = {
  maxFileSize: () => {
    const v = Number(process.env.FILE_TRANSFER_MAX_SIZE);
    return Number.isSafeInteger(v) && v > 0 ? v : DEFAULT_MAX_FILE_SIZE;
  },
  maxGlobal: () => Number(process.env.FILE_TRANSFER_GLOBAL_CONCURRENCY) || 20,
  maxPerSession: () =>
    Number(process.env.FILE_TRANSFER_SESSION_CONCURRENCY) || 2,
  connectTimeoutMs: () =>
    Number(process.env.FILE_TRANSFER_CONNECT_TIMEOUT_MS) || 5000,
  idleTimeoutMs: () =>
    Number(process.env.FILE_TRANSFER_IDLE_TIMEOUT_MS) || 30 * 1000,
  // Wall-clock ceiling for a whole transfer, independent of trickle traffic, so
  // a slow drip cannot hold a socket open forever.
  totalTimeoutMs: () =>
    Number(process.env.FILE_TRANSFER_TOTAL_TIMEOUT_MS) || 30 * 60 * 1000,

  active: 0,
  perSession: new Map(),

  tryAcquire(sessionId) {
    const sessionCount = this.perSession.get(sessionId) || 0;
    if (this.active >= this.maxGlobal()) return false;
    if (sessionCount >= this.maxPerSession()) return false;
    this.active += 1;
    this.perSession.set(sessionId, sessionCount + 1);
    return true;
  },

  release(sessionId) {
    this.active = Math.max(0, this.active - 1);
    const sessionCount = this.perSession.get(sessionId) || 0;
    if (sessionCount <= 1) this.perSession.delete(sessionId);
    else this.perSession.set(sessionId, sessionCount - 1);
  },
};

/**
 * Build a safe RFC 5987 Content-Disposition value for a filename. Never
 * concatenate a user-supplied filename directly into a response header.
 * @param {string} fileName
 * @returns {string}
 */
function contentDisposition(fileName) {
  const encoded = encodeURIComponent(String(fileName)).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename*=UTF-8''${encoded}`;
}

/**
 * Open a ServerQuery connection bound to the session's stored credentials and,
 * when a virtual server is selected, `use` that server so file-transfer
 * initialisation targets the right server.
 */
async function openServerQuery(session) {
  // Re-run whitelist validation on the host we are about to connect to, so a
  // whitelist tightened after login still guards these outbound connections.
  whitelist.check(session.credentials.host);

  const serverQuery = await TeamSpeak.connect(session.credentials);
  if (session.serverId) {
    try {
      await serverQuery.execute("use", { sid: session.serverId });
    } catch (_) {
      // Ignore "use" failures; ftinit* will surface a server error if needed.
    }
  }

  // The host is fixed to the already-validated TeamSpeak host. If a protocol
  // ever returned a different host it would have to be re-validated here via the
  // whitelist and an IP-range check to prevent DNS re-binding.
  return serverQuery;
}

/**
 * Start (or restart) the wall-clock transfer deadline. The returned handle is
 * cleared on finish so a finished transfer never leaks a timer.
 * @param {Function} onTimeout
 * @returns {NodeJS.Timeout}
 */
function startTotalTimer(onTimeout) {
  const timer = setTimeout(onTimeout, transferLimits.totalTimeoutMs());
  return timer;
}

/**
 * POST /api/file-transfers/download
 * Initialise a TeamSpeak download over the authenticated ServerQuery connection
 * and return a one-time ticket. The browser is never told the raw port/ftkey.
 */
router.post(
  "/download",
  asyncRoute(async (req, res, next) => {
    const { session } = res.locals;
    const { log } = res.locals;
    const body = req.body || {};

    const filePath = body.path;
    const cid = Number(body.cid);
    const cpw = typeof body.cpw === "string" ? body.cpw : "";
    const seekpos = Number(body.seekpos) || 0;

    if (typeof filePath !== "string" || !filePath) {
      throw createClientError("缺少文件路径");
    }
    if (!Number.isInteger(cid) || cid < 0) {
      throw createClientError("无效的频道 ID");
    }

    let serverQuery;
    try {
      serverQuery = await openServerQuery(session);
      const ft = await serverQuery.ftInitDownload({
        name: filePath,
        cid,
        cpw,
        seekpos,
      });
      const port = sanatizer.sanatizePort(ft.port);
      const ftkey = String(ft.ftkey || "");
      if (!ftkey) throw createClientError("无法初始化文件下载", 502);

      const ticket = ticketStore.create({
        sessionId: session.id,
        direction: "download",
        host: session.credentials.host,
        port,
        ftkey,
        expectedSize: Number(ft.size) || 0,
        fileName: path.basename(filePath),
      });

      log.info(`Initialised download for ${filePath}`);
      res.json({
        ticket: ticket.raw,
        fileName: ticket.fileName,
        size: Number(ft.size) || 0,
      });
    } finally {
      if (serverQuery) {
        try {
          await serverQuery.quit();
        } catch (_) {
          // Ignore quit errors; the init response has already been computed.
        }
      }
    }
  })
);

/**
 * GET /api/file-transfers/:ticket/download
 * Stream the TeamSpeak file back to the browser. The ticket is consumed, so it
 * can only be used once and never outlives its short TTL. All timeouts and
 * aborts release the socket, ticket and concurrency slot.
 */
router.get(
  "/:ticket/download",
  asyncRoute(async (req, res, next) => {
    const { session } = res.locals;
    const { log } = res.locals;
    const raw = req.params.ticket;

    const ticket = ticketStore.consume(raw, {
      sessionId: session.id,
      direction: "download",
    });

    if (!transferLimits.tryAcquire(session.id)) {
      ticketStore.delete(raw);
      throw createClientError("文件传输过于频繁，请稍后再试", 429);
    }

    const socket = new Socket();
    let settled = false;
    let totalTimer = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;

      if (totalTimer) clearTimeout(totalTimer);
      socket.destroy();
      transferLimits.release(session.id);
      ticketStore.delete(raw);

      if (error) {
        // While headers are not yet sent, let Express render the error; after
        // streaming has begun the only safe option is to destroy the response.
        if (!res.headersSent) return next(error);
        return res.destroy(error);
      }

      if (!res.headersSent) res.sendStatus(200);
    };

    totalTimer = startTotalTimer(() =>
      finish(createClientError("文件传输总时限超时", 408))
    );

    socket.setTimeout(transferLimits.connectTimeoutMs());

    socket.once("connect", () => {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", contentDisposition(ticket.fileName));
      if (ticket.expectedSize > 0) {
        res.setHeader("Content-Length", String(ticket.expectedSize));
      }

      socket.write(ticket.ftkey);
      log.info(`Downloading file ${ticket.fileName}`);

      socket.pipe(res);
    });

    socket.once("error", finish);
    socket.once("timeout", () =>
      finish(createClientError("文件传输连接超时", 408))
    );
    res.once("close", () => finish());
    req.once("aborted", () => finish(new Error("请求已中止")));
    req.once("error", finish);

    socket.connect(ticket.port, ticket.host);
  })
);

/**
 * POST /api/file-transfers/upload
 * Initialise a TeamSpeak upload and return a one-time ticket. The declared size
 * must be a safe, non-negative integer bounded by the configured maximum.
 */
router.post(
  "/upload",
  asyncRoute(async (req, res, next) => {
    const { session } = res.locals;
    const { log } = res.locals;
    const body = req.body || {};

    const filePath = body.path;
    const cid = Number(body.cid);
    const cpw = typeof body.cpw === "string" ? body.cpw : "";
    const size = Number(body.size);
    const overwrite = body.overwrite === undefined ? 1 : Number(body.overwrite);
    const resume = body.resume === undefined ? 0 : Number(body.resume);

    if (typeof filePath !== "string" || !filePath) {
      throw createClientError("缺少文件路径");
    }
    if (!Number.isInteger(cid) || cid < 0) {
      throw createClientError("无效的频道 ID");
    }
    // Must be a safe, non-negative integer. A zero-byte file is valid, but 0 is
    // never treated as "unlimited".
    if (!Number.isSafeInteger(size) || size < 0) {
      throw createClientError("无效的文件大小");
    }

    const maxSize = transferLimits.maxFileSize();
    if (size > maxSize) {
      throw createClientError("文件超过大小限制", 413);
    }

    let serverQuery;
    try {
      serverQuery = await openServerQuery(session);
      const ft = await serverQuery.ftInitUpload({
        name: filePath,
        cid,
        cpw,
        size,
        overwrite,
        resume,
      });
      const port = sanatizer.sanatizePort(ft.port);
      const ftkey = String(ft.ftkey || "");
      if (!ftkey) throw createClientError("无法初始化文件上传", 502);

      const ticket = ticketStore.create({
        sessionId: session.id,
        direction: "upload",
        host: session.credentials.host,
        port,
        ftkey,
        expectedSize: size,
        fileName: path.basename(filePath),
      });

      log.info(`Initialised upload for ${filePath}`);
      res.json({
        ticket: ticket.raw,
        fileName: ticket.fileName,
        size,
      });
    } finally {
      if (serverQuery) {
        try {
          await serverQuery.quit();
        } catch (_) {
          // Ignore quit errors.
        }
      }
    }
  })
);

/**
 * POST /api/file-transfers/:ticket/upload
 * Receive the multipart file bytes and forward them to the TeamSpeak transfer
 * port. The ticket supplies the only valid port/ftkey the backend will use, and
 * the exact number of bytes received must equal the declared size.
 */
router.post(
  "/:ticket/upload",
  asyncRoute(async (req, res, next) => {
    const { session } = res.locals;
    const { log } = res.locals;
    const raw = req.params.ticket;

    const ticket = ticketStore.consume(raw, {
      sessionId: session.id,
      direction: "upload",
    });

    if (!transferLimits.tryAcquire(session.id)) {
      ticketStore.delete(raw);
      throw createClientError("文件传输过于频繁，请稍后再试", 429);
    }

    const socket = new Socket();
    let settled = false;
    let fileSeen = false;
    let receivedBytes = 0;
    let totalTimer = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;

      if (totalTimer) clearTimeout(totalTimer);
      socket.destroy();
      transferLimits.release(session.id);
      ticketStore.delete(raw);

      if (error) {
        if (!res.headersSent) return next(error);
        return res.destroy(error);
      }

      if (!res.headersSent) res.sendStatus(200);
    };

    // A wall-clock deadline that cannot be beaten by a slow trickle of traffic.
    totalTimer = startTotalTimer(() =>
      finish(createClientError("文件传输总时限超时", 408))
    );

    const declaredSize = ticket.expectedSize;

    let busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: {
          files: 1,
          // Must always be finite (never Infinity). Busboy's fileSize limit is
          // inclusive, so use declaredSize + 1: an exact-size file is not
          // falsely truncated, while anything larger hits the limit handler.
          fileSize: declaredSize + 1,
        },
      });
    } catch (_) {
      return finish(createClientError("无效的上传请求", 400));
    }

    busboy.on("file", (fieldname, file) => {
      if (fieldname !== "file" || fileSeen) {
        // Reject extra fields and a second file; drain the stream either way.
        file.resume();
        return finish(createClientError("只允许一个 file 字段", 400));
      }
      fileSeen = true;

      socket.setTimeout(transferLimits.idleTimeoutMs());

      socket.once("error", finish);
      socket.once("timeout", () =>
        finish(createClientError("文件传输空闲超时", 408))
      );
      file.once("error", finish);
      busboy.once("error", finish);

      // Busboy truncates a file that exceeds the declared size and emits this.
      file.on("limit", () =>
        finish(createClientError("上传文件超过大小限制", 413))
      );

      file.on("data", (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > declaredSize) {
          finish(createClientError("上传字节数超过声明大小", 413));
        }
      });

      log.info(`Start uploading file "${ticket.fileName}"`);
      socket.connect(ticket.port, ticket.host);
      // Connect first so writes are buffered while connecting, then stream the
      // ftkey and the file body (in that order).
      socket.write(ticket.ftkey);
      file.pipe(socket);
    });

    busboy.once("filesLimit", () =>
      finish(createClientError("只允许一个文件字段", 400))
    );
    busboy.once("partsLimit", () =>
      finish(createClientError("多余字段", 400))
    );

    busboy.once("finish", () => {
      // If no file field was ever received, reject; otherwise wait for the TCP
      // write to finish before responding.
      if (!fileSeen) finish(createClientError("缺少文件", 400));
    });

    // Wait for the write side to complete, not merely for Busboy to finish
    // parsing the multipart body. The exact byte count must match the declared
    // size, otherwise the transfer is treated as corrupt rather than successful.
    socket.once("finish", () => {
      if (receivedBytes !== declaredSize) {
        return finish(
          createClientError("上传字节数与声明大小不一致", 400)
        );
      }
      finish();
    });

    req.once("aborted", () => finish(new Error("请求已中止")));
    req.once("error", finish);

    req.pipe(busboy);
  })
);

module.exports = router;
