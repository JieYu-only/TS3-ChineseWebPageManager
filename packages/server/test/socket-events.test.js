const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

// Captured so a rejected promise or thrown exception that leaks out of the
// socket handlers is visible to the assertions below instead of crashing the
// test runner mid-run.
const unhandledRejections = [];
process.on("unhandledRejection", (e) => unhandledRejections.push(e));
process.on("uncaughtException", (e) => unhandledRejections.push(e));

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-sockevt-"));
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
    client.on("teamspeak-connected", () => done({ ok: true, client }));
  });
}

function emit(client, event, ...args) {
  return new Promise((resolve) => {
    client.emit(event, ...args, (response) => resolve(response));
  });
}

test("socket: malformed event handling stays contained", async (t) => {
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

  const session = sessionManager.create({ credentials, remember: false });
  const { ok, client } = await connectWithCookie(`ts3_session=${session.id}`);
  assert.ok(ok, "socket should connect with a valid session");
  t.after(() => client.close());

  await t.test("teamspeak-execute(null) yields a controlled error", async () => {
    const response = await emit(client, "teamspeak-execute", null);
    assert.ok(response && response.message, "should return a message");
    assert.strictEqual(response.connected, true);
    assert.deepStrictEqual(unhandledRejections, []);
  });

  await t.test("teamspeak-execute with a missing ack does not throw", async () => {
    await new Promise((resolve) => {
      client.emit("teamspeak-execute", null); // no ack callback
      setTimeout(resolve, 100);
    });
    assert.deepStrictEqual(unhandledRejections, []);
  });

  await t.test("teamspeak-downloadfile with a non-string path is contained", async () => {
    const response = await emit(client, "teamspeak-downloadfile", { path: 123 });
    assert.ok(response && response.message, "should return a message");
    assert.strictEqual(response.connected, true);
    assert.deepStrictEqual(unhandledRejections, []);
  });

  await t.test("teamspeak-downloadfile with a non-object payload is contained", async () => {
    const response = await emit(client, "teamspeak-downloadfile", "not-an-object");
    assert.ok(response && response.message, "should return a message");
    assert.strictEqual(response.connected, true);
    assert.deepStrictEqual(unhandledRejections, []);
  });

  await t.test("teamspeak-deploysnapshot with a non-string is contained", async () => {
    const response = await emit(client, "teamspeak-deploysnapshot", 12345);
    assert.ok(response && response.message, "should return a message");
    assert.strictEqual(response.connected, true);
    assert.deepStrictEqual(unhandledRejections, []);
  });

  await t.test("valid events still succeed", async () => {
    const snapshot = await emit(client, "teamspeak-createsnapshot");
    assert.ok(Array.isArray(snapshot));

    const registered = await emit(client, "teamspeak-registerevents");
    assert.strictEqual(registered, "ok");
    assert.deepStrictEqual(unhandledRejections, []);
  });
});
