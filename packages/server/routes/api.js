/**
 * API routes.
 *
 * Session routes (login / logout / status) handle authentication and set the
 * HttpOnly session cookie. File transfers are protected by the same server-side
 * session plus short-lived, single-use tickets — the client never provides the
 * TeamSpeak transfer host, port or key. ServerQuery credentials never leave the
 * server.
 */

const express = require("express");
const router = express.Router();
const { TeamSpeak } = require("ts3-nodejs-library");
const {
  logger,
  whitelist,
  sanatizer,
  asyncRoute,
  createClientError,
  SlidingWindowRateLimiter,
} = require("../utils");
const { sessionManager } = require("../session");
const socket = require("../socket");
const fileTransfers = require("./fileTransfers");

const SESSION_COOKIE = "ts3_session";
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Login throttling (per client IP). Limits are env-tunable so operators can
// tighten them and tests can raise them without touching code.
const loginRateLimiter = new SlidingWindowRateLimiter({
  windowMs: Number(process.env.SESSION_LOGIN_RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.SESSION_LOGIN_RATE_MAX) || 5,
});

/** Resolve the client IP, honouring the trust-proxy setting when enabled. */
function getClientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Cookie options for the session id. HttpOnly keeps the id out of JavaScript;
 * Secure is enabled in production behind HTTPS unless explicitly disabled for
 * plain-HTTP deployments via SESSION_COOKIE_SECURE=false. SameSite=strict is
 * used so the cookie is never attached to cross-site requests.
 */
function sessionCookieOptions(remember) {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.SESSION_COOKIE_SECURE !== "false",
    sameSite: "strict",
    path: "/",
    maxAge: remember ? REMEMBER_MS : undefined,
  };
}

/** Attach a request-scoped child logger to every API request. */
router.use((req, res, next) => {
  res.locals.log = logger.child({ client: getClientIp(req) });
  next();
});

/**
 * Origin / CSRF guard. Cookies are sent automatically by the browser, so any
 * state-changing request whose Origin is neither the same origin nor an
 * explicitly configured origin is rejected. In development the check is relaxed
 * so the Vue dev server (a different origin) is not blocked.
 */
router.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next(); // non-browser client (curl / tests)

  if (process.env.NODE_ENV !== "production") return next();

  const allowed = new Set(
    (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  );

  let sameOrigin = false;
  try {
    const host = req.get("host");
    sameOrigin = origin === `${req.protocol}://${host}`;
  } catch (_) {
    sameOrigin = false;
  }

  if (sameOrigin || allowed.has(origin)) return next();

  return res.status(403).json({ message: "来源站点不受信任" });
});

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
 * HttpOnly session cookie. Credentials are stored on the server only. Failures
 * use a single, non-revealing message.
 */
router.post(
  "/session/login",
  asyncRoute(async (req, res, next) => {
    const ip = getClientIp(req);
    const rate = loginRateLimiter.check(ip);
    if (!rate.allowed) {
      res.setHeader("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
      throw createClientError("登录过于频繁，请稍后再试", 429);
    }

    try {
      const options = req.body || {};
      const validOptions = sanatizer.sanatizeOptions(options);

      whitelist.check(validOptions.host);

      // Validate the credentials by attempting a real connection, then release.
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

      loginRateLimiter.reset(ip);

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
  })
);

/**
 * POST /session/logout
 * Invalidate the session, close its sockets and clear the cookie.
 */
router.post(
  "/session/logout",
  asyncRoute(async (req, res) => {
    const sessionId = req.cookies && req.cookies[SESSION_COOKIE];

    if (sessionId) {
      sessionManager.delete(sessionId);
      socket.closeSession(sessionId);
    }

    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(false));
    res.json({ connected: false });
  })
);

/**
 * GET /session/status
 * Report whether the current session cookie maps to a valid session.
 */
router.get(
  "/session/status",
  asyncRoute(async (req, res) => {
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
  })
);

/**
 * Protect the file transfer routes with the server-side session. The session is
 * the only source of the TeamSpeak host; a transfer ticket supplies the port and
 * ftkey that the backend will use.
 */
router.use("/file-transfers", fileTransfers);

/**
 * Persist the currently selected virtual server in the authenticated session.
 */
router.patch(
  "/session/server",
  asyncRoute(async (req, res) => {
    const sessionId = req.cookies && req.cookies[SESSION_COOKIE];
    const serverId = req.body && req.body.serverId;

    if (serverId === undefined || serverId === null || serverId === "") {
      return res.status(400).json({ message: "缺少服务器 ID" });
    }

    const session = sessionManager.updateServerId(sessionId, serverId);
    if (!session) return res.status(401).json({ message: "未登录或会话已过期" });

    return res.json({ serverId: session.serverId });
  })
);

/**
 * Get newest available TeamSpeak server versions.
 * The fetch is run on the server side to bypass CORS restrictions on the client side.
 */
router.get(
  "/teamspeak-versions",
  asyncRoute(async (req, res, next) => {
    const fetch = require("node-fetch");
    let data = await fetch(
      "https://www.teamspeak.com/versions/server.json"
    ).then((data) => data.json());

    res.json(data);
  })
);

/**
 * Handle errors. This middleware needs to have 4 arguments in the callback
 * function; otherwise Express will not treat it as an error middleware.
 * Internal errors are logged but never revealed to the caller.
 */
router.use((error, req, res, next) => {
  const log = res.locals.log || logger.child({ client: getClientIp(req) });

  if (res.headersSent) {
    return next(error);
  }

  const expose = Boolean(error.expose);
  const status = expose ? error.status || 400 : 500;

  log.error(error.message || error);

  res.status(status).json({
    message: expose ? error.message : "服务器内部错误",
  });
});

module.exports = router;
