const socket = {};
let io = null;

socket.init = (server, corsOptions) => {
  const { TeamSpeak } = require("ts3-nodejs-library");
  const { logger, whitelist, sanatizer } = require("./utils");
  const cookie = require("cookie");
  const { sessionManager } = require("./session");

  io = require("socket.io")(server, { cors: corsOptions });

  /**
   * Authenticate the socket by resolving the HttpOnly session cookie to a valid
   * server-side session. Credentials are never sent by the client.
   */
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const sessionId = cookies.ts3_session;

      if (!sessionId) return next(new Error("未登录或会话已过期"));

      const session = sessionManager.get(sessionId);

      if (!session) return next(new Error("未登录或会话已过期"));

      socket.data.sessionId = sessionId;
      socket.data.session = session;

      next();
    } catch (error) {
      next(new Error("会话验证失败"));
    }
  });

  io.on("connection", async (socket) => {
    const session = socket.data.session;
    const ip =
      socket.handshake.headers["x-forwarded-for"] ||
      socket.client.conn.remoteAddress;
    const log = logger.child({ client: ip });

    log.info("Socket.io connected");

    /**
     * Send the TeamSpeak error message back to the frontend.
     * @param {Object} err
     * @param {Function} fn
     */
    const handleServerQueryError = (err, fn) => {
      log.error(err.message);

      const serverQuery = socket.data.serverQuery;

      if (serverQuery && serverQuery.query && serverQuery.query.connected) {
        fn({ message: err.message, id: err.id, connected: true });
      } else {
        fn({ message: err.message, connected: false });
      }
    };

    /**
     * Serialise a response, replacing undefined with "" so socket.io JSON
     * serialisation keeps every property.
     * @param {*} response
     * @param {Function} fn
     */
    const handleResponse = (response, fn) => {
      response = JSON.stringify(response, (k, v) => (v === undefined ? "" : v));
      fn(JSON.parse(response));
    };

    /**
     * Register TeamSpeak event listeners that forward to the client.
     * @param {object} serverQuery
     */
    const initEventListeners = (serverQuery) => {
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

      initEventListeners(serverQuery);

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
    socket.on("teamspeak-execute", async (query, fn) => {
      let { command, params, options } = query;

      try {
        if (!socket.data.serverQuery) throw new Error("连接未就绪");

        let response = await socket.data.serverQuery.execute(
          command,
          params,
          options
        );

        handleResponse(response, fn);
      } catch (err) {
        handleServerQueryError(err, fn);
      }
    });

    /**
     * Create a snapshot.
     */
    socket.on("teamspeak-createsnapshot", async (fn) => {
      try {
        if (!socket.data.serverQuery) throw new Error("连接未就绪");

        let response = await socket.data.serverQuery.execute(
          "serversnapshotcreate"
        );

        handleResponse(response, fn);
      } catch (err) {
        handleServerQueryError(err, fn);
      }
    });

    /**
     * Deploy a snapshot.
     */
    socket.on("teamspeak-deploysnapshot", async (snapshot, fn) => {
      try {
        if (!socket.data.serverQuery) throw new Error("连接未就绪");

        let verifiedSnapshot = Buffer.from(
          snapshot.toString(),
          "base64"
        ).toString("base64");
        let response = await socket.data.serverQuery.deploySnapshot(
          verifiedSnapshot
        );

        handleResponse(response, fn);
      } catch (err) {
        handleServerQueryError(err, fn);
      }
    });

    /**
     * Register TeamSpeak event notifications.
     */
    socket.on("teamspeak-registerevents", async (fn) => {
      try {
        if (!socket.data.serverQuery) throw new Error("连接未就绪");

        const serverQuery = socket.data.serverQuery;

        if (serverQuery.eventNames().length > 1) {
          await serverQuery.registerEvent("textserver");
          await serverQuery.registerEvent("textchannel");
          await serverQuery.registerEvent("textprivate");
          await serverQuery.registerEvent("server");
          await serverQuery.registerEvent("channel", 0);
        } else {
          initEventListeners(serverQuery);
        }

        handleResponse("ok", fn);
      } catch (err) {
        handleServerQueryError(err, fn);
      }
    });

    /**
     * Unregister TeamSpeak event notifications.
     */
    socket.on("teamspeak-unregisterevent", async (fn) => {
      try {
        if (!socket.data.serverQuery) throw new Error("连接未就绪");

        let response = await socket.data.serverQuery.unregisterEvent();

        handleResponse(response, fn);
      } catch (err) {
        handleServerQueryError(err, fn);
      }
    });

    /**
     * Download a small file (e.g. avatars) as base64.
     */
    socket.on("teamspeak-downloadfile", async ({ path, cid, cpw }, fn) => {
      try {
        if (!socket.data.serverQuery) throw new Error("连接未就绪");

        let buffer = await socket.data.serverQuery.downloadFile(path, cid, cpw);

        handleResponse(buffer.toString("base64"), fn);
      } catch (err) {
        handleServerQueryError(err, fn);
      }
    });

    /**
     * When the client disconnects, quit the ServerQuery connection.
     */
    socket.on("disconnect", async () => {
      log.info("Socket.io disconnected");

      const serverQuery = socket.data.serverQuery;

      if (serverQuery instanceof TeamSpeak) {
        try {
          await serverQuery.execute("quit");
        } catch (err) {
          log.error(err.message);
        }
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
