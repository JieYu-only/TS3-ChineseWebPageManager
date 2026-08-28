const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

// Throwaway env + a ServerQuery stub so the socket connection handler succeeds.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-sock-"));
process.env.SESSION_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
process.env.DATA_DIR = DATA_DIR;
process.env.SESSION_FILE = path.join(DATA_DIR, "sessions.enc");

const { TeamSpeak } = require("ts3-nodejs-library");
TeamSpeak.connect = async () => ({
  on() {},
  removeAllListeners() {},
  execute() {
    return Promise.resolve([]);
  },
  eventNames() {
    return ["newListener"];
  },
  registerEvent() {
    return Promise.resolve();
  },
  unregisterEvent() {
    return Promise.resolve();
  },
  downloadFile() {
    return Promise.resolve(Buffer.from("x"));
  },
  deploySnapshot() {
    return Promise.resolve();
  },
  query: { connected: true },
});

const socket = require("../socket");
const { sessionManager } = require("../session");
const { io: Client } = require("socket.io-client");

let server;
let port;

function connectWithCookie(cookie) {
  return new Promise((resolve) => {
    const client = Client(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 3000,
      extraHeaders: cookie ? { Cookie: cookie } : {},
    });

    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    client.on("connect", () => done({ ok: true, client }));
    client.on("connect_error", (err) => {
      client.close();
      done({ ok: false, err: err.message, client });
    });
    client.on("teamspeak-connected", () => {
      client.close();
      done({ ok: true, client });
    });
  });
}

test("socket: session authentication", async (t) => {
  server = http.createServer();
  socket.init(server, { origin: true });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  port = server.address().port;

  const credentials = {
    host: "ts3.example.com",
    queryport: 10022,
    protocol: "ssh",
    username: "serveradmin",
    password: "secret",
  };

  await t.test("socket connection is rejected without a cookie", async () => {
    const result = await connectWithCookie(null);
    assert.strictEqual(result.ok, false, "should be rejected");
  });

  await t.test("socket connection is rejected with a forged session id", async () => {
    const result = await connectWithCookie("ts3_session=forged-id-123");
    assert.strictEqual(result.ok, false, "forged id should be rejected");
  });

  await t.test("socket connection is rejected for an expired session", async () => {
    const session = sessionManager.create({ credentials, remember: true });
    // Expire it immediately.
    session.expiresAt = Date.now() - 1000;
    sessionManager.encrypted.set(session);

    const result = await connectWithCookie(`ts3_session=${session.id}`);
    assert.strictEqual(result.ok, false, "expired session should be rejected");
  });

  await t.test("socket connection succeeds with a valid session", async () => {
    const session = sessionManager.create({ credentials, remember: false });
    const result = await connectWithCookie(`ts3_session=${session.id}`);
    assert.strictEqual(result.ok, true, "valid session should connect");
  });
});
