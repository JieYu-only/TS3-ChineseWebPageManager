const socket = {};
let io = null;

socket.init = (server, corsOptions) => {
  const { TeamSpeak } = require("ts3-nodejs-library");
  const {
    logger,
    createClientError,
    SlidingWindowRateLimiter,
    resolveClientIp,
  } = require("./utils");
  const cookie = require("cookie");
  const { sessionManager } = require("./session");

  // Cap inbound Socket.IO message size to 1 MiB. Larger payloads (e.g. snapshot
  // restore) should go through a dedicated HTTP endpoint, not a global socket
  // buffer increase.
  io = require("socket.io")(server, {
    cors: corsOptions,
    maxHttpBufferSize: 1 * 1024 * 1024,
  });

  const connectionLimiter = new SlidingWindowRateLimiter({
    windowMs: Number(process.env.SOCKET_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    max: Number(process.env.SOCKET_RATE_LIMIT_MAX) || 10,
  });
  const sessionConnections = new Map();
  const SESSION_MAX_CONNECTIONS =
    Number(process.env.SOCKET_SESSION_MAX_CONNECTIONS) || 3;

  // Use the same trust-proxy policy as the HTTP layer: the forwarding header is
  // ignored unless TRUST_PROXY=1, so a client cannot bypass connection limiting
  // by injecting a different X-Forwarded-For.
  const getIp = (socket) =>
    resolveClientIp({
      remoteAddress: socket.client.conn.remoteAddress,
      xForwardedFor: socket.handshake.headers["x-forwarded-for"],
    });

  /**
   * Authenticate the socket by resolving the HttpOnly session cookie to a valid
   * server-side session. Credentials are never sent by the client. Connection
   * rate is throttled per IP and per session.
   */
  io.use((socket, next) => {
    try {
      const ip = getIp(socket);

      if (!connectionLimiter.check(ip).allowed) {
        return next(new Error("连接过于频繁，请稍后再试"));
      }

      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const sessionId = cookies.ts3_session;

      if (!sessionId) return next(new Error("未登录或会话已过期"));

      const session = sessionManager.get(sessionId);

      if (!session) return next(new Error("未登录或会话已过期"));

      const active = sessionConnections.get(sessionId) || 0;
      if (active >= SESSION_MAX_CONNECTIONS) {
        return next(new Error("会话连接数已达上限"));
      }

      socket.data.sessionId = sessionId;
      socket.data.session = session;

      next();
    } catch (error) {
      next(new Error("会话验证失败"));
    }
  });

  io.on("connection", async (socket) => {
    const session = socket.data.session;
    const ip = getIp(socket);
    const log = logger.child({ client: ip });

    sessionConnections.set(
      session.id,
      (sessionConnections.get(session.id) || 0) + 1
    );

    log.info("Socket.io connected");

    /**
     * Send a payload back through the acknowledgement callback, tolerating a
     * callback that was never provided by the client.
     * @param {Function} ack
     * @param {*} payload
     */
    const reply = (ack, payload) => {
      if (typeof ack === "function") {
        ack(payload);
      }
    };

    /**
     * Serialise a response, replacing undefined with "" so socket.io JSON
     * serialisation keeps every property.
     * @param {*} response
     * @param {Function} ack
     */
    const handleResponse = (response, ack) => {
      const ser = JSON.stringify(response, (k, v) => (v === undefined ? "" : v));
      reply(ack, JSON.parse(ser));
    };

    /**
     * Wrap an event handler so no rejected promise can escape as an unhandled
     * rejection. Errors are logged and, when an acknowledgement callback was
     * supplied, delivered to the client as a controlled error payload.
     * @param {(arg: *, ack: Function) => Promise<*>} handler
     * @returns {Function}
     */
    const safeSocketHandler = (handler) => (...args) => {
      Promise.resolve(handler(...args)).catch((error) => {
        const ack = args.at(-1);
        const serverQuery = socket.data.serverQuery;
        const connected = Boolean(
          serverQuery && serverQuery.query && serverQuery.query.connected
        );

        log.error(error.stack || error.message);

        // Preserve TeamSpeak response details and safe client errors; fall back
        // to a generic message for internal failures.
        if (error && error.id) {
          reply(ack, { message: error.message, id: error.id, connected });
        } else if (error && error.expose) {
          reply(ack, { message: error.message, connected });
        } else {
          reply(ack, { message: "请求处理失败", connected });
        }
      });
    };

    const notReady = () => {
      if (socket.data.serverQuery) return;
      throw createClientError("连接未就绪", 409);
    };

    /**
     * Register TeamSpeak event listeners that forward to the client.
     * @param {object} serverQuery
     */
    const initLifecycleListeners = (serverQuery) => {
      if (serverQuery.__managerLifecycleListenersReady) return;
      serverQuery.__managerLifecycleListenersReady = true;

      serverQuery.on("error", (err) => {
        log.error(err.stack);
        socket.emit("teamspeak-error", err);
      });
      serverQuery.on("flooding", () => log.warn("Flooding"));
      serverQuery.on("close", () => {
        log.info("ServerQuery connection closed");
        serverQuery.removeAllListeners();
        socket.emit("teamspeak-disconnect");
      });
    };

    const initEventListeners = (serverQuery) => {
      if (serverQuery.__managerEventListenersReady) return;
      serverQuery.__managerEventListenersReady = true;

      serverQuery.on("clientconnect", (data) =>
        socket.emit("teamspeak-clientconnect", data)
      );
      serverQuery.on("clientdisconnect", (data) =>
        socket.emit("teamspeak-clientdisconnect", data)
      );
      serverQuery.on("clientmoved", (data) =>
        socket.emit("teamspeak-clientmoved", data)
      );
      serverQuery.on("tokenused", (data) =>
        socket.emit("teamspeak-tokenused", data)
      );
      serverQuery.on("textmessage", (data) =>
        socket.emit("teamspeak-textmessage", data)
      );
      serverQuery.on("serveredit", (data) =>
        socket.emit("teamspeak-serveredit", data)
      );
      serverQuery.on("channeledit", (data) =>
        socket.emit("teamspeak-channeledit", data)
      );
      serverQuery.on("channelcreate", (data) =>
        socket.emit("teamspeak-channelcreate", data)
      );
      serverQuery.on("channelmoved", (data) =>
        socket.emit("teamspeak-channelmoved", data)
      );
      serverQuery.on("channeldelete", (data) =>
        socket.emit("teamspeak-channeldelete", data)
      );
    };

    // Establish the ServerQuery connection from the stored (server-side)
    // credentials. This replaces the old client-supplied "teamspeak-connect".
    try {
      const serverQuery = await TeamSpeak.connect(session.credentials);

      socket.data.serverQuery = serverQuery;

      if (session.serverId) {
        await serverQuery.execute("use", { sid: session.serverId });
      }

      // Domain listeners trigger servernotifyregister in the TeamSpeak library.
      // A fresh session has no selected virtual server, so registering here
      // produces `invalid serverID`. Attach lifecycle listeners immediately and
      // wait for the explicit register request after `use` succeeds.
      initLifecycleListeners(serverQuery);
      if (session.serverId) initEventListeners(serverQuery);

      if (session.remember) {
        sessionManager.get(session.id); // refresh lastUsedAt
      }

      socket.emit("teamspeak-connected", {
        connected: true,
        serverId: session.serverId,
      });
    } catch (error) {
      log.error(error.message);
      socket.emit("teamspeak-error", { message: error.message, connected: false });
    }

    /**
     * Send command to the ServerQuery.
     */
    socket.on(
      "teamspeak-execute",
      safeSocketHandler(async (query, ack) => {
        if (!query || typeof query !== "object") {
          throw createClientError("无效的请求参数");
        }

        const { command, params = {}, options = [] } = query;

        if (typeof command !== "string" || !command) {
          throw createClientError("缺少命令");
        }

        notReady();

        const response = await socket.data.serverQuery.execute(
          command,
          params,
          options
        );

        handleResponse(response, ack);
      })
    );

    /**
     * Create a snapshot.
     */
    socket.on(
      "teamspeak-createsnapshot",
      safeSocketHandler(async (ack) => {
        notReady();

        const response = await socket.data.serverQuery.execute(
          "serversnapshotcreate"
        );

        handleResponse(response, ack);
      })
    );

    /**
     * Deploy a snapshot.
     */
    socket.on(
      "teamspeak-deploysnapshot",
      safeSocketHandler(async (snapshot, ack) => {
        notReady();

        if (typeof snapshot !== "string") {
          throw createClientError("无效的快照参数");
        }

        const verifiedSnapshot = Buffer.from(snapshot, "base64").toString(
          "base64"
        );
        const response = await socket.data.serverQuery.deploySnapshot(
          verifiedSnapshot
        );

        handleResponse(response, ack);
      })
    );

    /**
     * Register TeamSpeak event notifications.
     */
    socket.on(
      "teamspeak-registerevents",
      safeSocketHandler(async (ack) => {
        notReady();

        const serverQuery = socket.data.serverQuery;

        initEventListeners(serverQuery);
        await serverQuery.registerEvent("textserver");
        await serverQuery.registerEvent("textchannel");
        await serverQuery.registerEvent("textprivate");
        await serverQuery.registerEvent("server");
        await serverQuery.registerEvent("channel", 0);

        handleResponse("ok", ack);
      })
    );

    /**
     * Unregister TeamSpeak event notifications.
     */
    socket.on(
      "teamspeak-unregisterevent",
      safeSocketHandler(async (ack) => {
        notReady();

        const response = await socket.data.serverQuery.unregisterEvent();

        handleResponse(response, ack);
      })
    );

    /**
     * Download a small file (e.g. avatars) as base64.
     */
    socket.on(
      "teamspeak-downloadfile",
      safeSocketHandler(async (payload, ack) => {
        notReady();

        if (!payload || typeof payload !== "object") {
          throw createClientError("无效的下载参数");
        }

        const { path, cid, cpw = "" } = payload;
        if (typeof path !== "string" || !path) {
          throw createClientError("缺少文件路径");
        }

        const buffer = await socket.data.serverQuery.downloadFile(path, cid, cpw);

        handleResponse(buffer.toString("base64"), ack);
      })
    );

    /**
     * When the client disconnects, quit the ServerQuery connection.
     */
    socket.on("disconnect", () => {
      sessionConnections.set(
        session.id,
        Math.max(0, (sessionConnections.get(session.id) || 1) - 1)
      );

      log.info("Socket.io disconnected");

      const serverQuery = socket.data.serverQuery;

      if (serverQuery instanceof TeamSpeak) {
        serverQuery.execute("quit").catch((err) => {
          log.error(err.message);
        });
      }
    });
  });
};

/**
 * Close every socket belonging to a session (used on logout).
 * @param {string} sessionId
 */
socket.closeSession = (sessionId) => {
  if (!io) return;

  for (const [, s] of io.sockets.sockets.entries()) {
    if (s.data && s.data.sessionId === sessionId) {
      s.disconnect(true);
    }
  }
};

module.exports = socket;
