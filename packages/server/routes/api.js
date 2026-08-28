/**
 * API routes.
 *
 * Session routes (login / logout / status) handle authentication and set the
 * HttpOnly session cookie. The download / upload streams are protected by the
 * same server-side session. ServerQuery credentials never leave the server.
 */

const express = require("express");
const router = express.Router();
const { TeamSpeak } = require("ts3-nodejs-library");
const { logger, whitelist, sanatizer } = require("../utils");
const { Socket } = require("net");
const Busboy = require("busboy");
const fetch = require("node-fetch");
const { sessionManager } = require("../session");
const socket = require("../socket");

const SESSION_COOKIE = "ts3_session";
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Cookie options for the session id. HttpOnly keeps the id out of JavaScript;
 * Secure is enabled in production behind HTTPS unless explicitly disabled for
 * plain-HTTP deployments via SESSION_COOKIE_SECURE=false.
 */
function sessionCookieOptions(remember) {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.SESSION_COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? REMEMBER_MS : undefined,
  };
}

/**
 * Health check for monitoring and CI. Registered before auth so it can be
 * probed without logging in.
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

/**
 * POST /session/login
 * Validate ServerQuery credentials, create a server-side session and set the
 * HttpOnly session cookie. Credentials are stored on the server only.
 */
router.post("/session/login", async (req, res, next) => {
  try {
    const options = req.body || {};
    const validOptions = sanatizer.sanatizeOptions(options);

    whitelist.check(validOptions.host);

    // Validate the credentials by attempting a real connection, then release it.
    // The persistent ServerQuery connection is later established by the socket.
    const probe = await TeamSpeak.connect(validOptions);
    try {
      await probe.quit();
    } catch (_) {
      // Ignore shutdown errors from the probe connection.
    }

    const remember = Boolean(options.remember);
    const session = sessionManager.create({
      credentials: validOptions,
      remember,
      serverId: options.serverId || null,
    });

    res.cookie(SESSION_COOKIE, session.id, sessionCookieOptions(remember));
    res.json({
      connected: true,
      expiresAt: session.expiresAt,
      remembered: remember,
    });
  } catch (error) {
    // Use a uniform, non-revealing authentication error message.
    res.status(401).json({
      connected: false,
      message: "用户名或密码错误，或者无法连接到目标服务器",
    });
  }
});

/**
 * POST /session/logout
 * Invalidate the session, close its sockets and clear the cookie.
 */
router.post("/session/logout", async (req, res) => {
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE];

  if (sessionId) {
    sessionManager.delete(sessionId);
    socket.closeSession(sessionId);
  }

  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(false));
  res.json({ connected: false });
});

/**
 * GET /session/status
 * Report whether the current session cookie maps to a valid session.
 */
router.get("/session/status", async (req, res) => {
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE];
  const session = sessionManager.get(sessionId);

  if (!session) {
    res.json({ connected: false });
    return;
  }

  res.json({
    connected: true,
    expiresAt: session.expiresAt,
    serverId: session.serverId,
  });
});

/**
 * Protect the file transfer routes with the server-side session.
 */
router.use(async (req, res, next) => {
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  let log = logger.child({ client: ip });

  res.locals.log = log;

  try {
    const sessionId = req.cookies && req.cookies[SESSION_COOKIE];
    const session = sessionManager.get(sessionId);

    if (!session) {
      const error = new Error("未登录或会话已过期");
      error.status = 401;
      return next(error);
    }

    res.locals.session = session;
    return next();
  } catch (err) {
    return next(err);
  }
});

/** Persist the currently selected virtual server in the authenticated session. */
router.patch("/session/server", (req, res) => {
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE];
  const serverId = req.body && req.body.serverId;

  if (serverId === undefined || serverId === null || serverId === "") {
    return res.status(400).json({ message: "缺少服务器 ID" });
  }

  const session = sessionManager.updateServerId(sessionId, serverId);
  if (!session) return res.status(401).json({ message: "未登录或会话已过期" });

  return res.json({ serverId: session.serverId });
});

/**
 * Download file from the server.
 */
router.get("/download", async (req, res, next) => {
  try {
    let { ftkey, size, name } = req.query;

    let port = sanatizer.sanatizePort(req.query.port);
    let { log, session } = res.locals;
    let socket = new Socket();

    socket.connect(port, session.credentials.host);

    socket.on("connect", () => {
      res.setHeader("content-disposition", `attachment; filename=${name}`);
      res.setHeader("content-length", size);

      socket.write(ftkey);

      log.info(`Downloading file ${name}`);

      socket.pipe(res);
    });

    socket.on("error", (err) => {
      socket.destroy();

      next(err);
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Upload file to the server
 */
router.post("/upload", async (req, res, next) => {
  let ftkey = req.headers["x-file-transfer-key"];
  let port = sanatizer.sanatizePort(req.headers["x-file-transfer-port"]);
  let { log, session } = res.locals;
  let busboy = Busboy({ headers: req.headers });
  let socket = new Socket();

  try {
    busboy.on("file", async (fieldname, file, info) => {
      let { filename } = info;
      socket.setTimeout(5000);

      socket.connect(port, session.credentials.host);

      socket.on("connect", () => {
        socket.write(ftkey);

        log.info(`Start uploading file "${filename}"`);

        file.pipe(socket);
      });

      socket.on("error", async (err) => {
        socket.destroy();

        next(err);
      });

      socket.on("timeout", () => {
        log.info(`Stopped uploading file "${filename}"`);

        socket.end();
      });

      busboy.on("finish", async () => {
        log.info(`Finished uploading file "${filename}"`);

        socket.end();

        res.sendStatus(200);
      });
    });

    req.pipe(busboy);
  } catch (err) {
    next(err);
  }
});

/**
 * Get newest available TeamSpeak server versions.
 * The fetch is run on the server side to bypass CORS restrictions on the client side.
 */
router.get("/teamspeak-versions", async (req, res, next) => {
  try {
    let data = await fetch(
      "https://www.teamspeak.com/versions/server.json"
    ).then((data) => data.json());

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Handle errors.
 * This middleware needs to have 4 arguments in the callback function.
 * Otherwise express.js will not handle it as an error middleware.
 */
router.use((error, req, res, next) => {
  let { log } = res.locals;

  log.error(error.message);

  res.status(error.status || 400).send(error.message);
});

module.exports = router;
