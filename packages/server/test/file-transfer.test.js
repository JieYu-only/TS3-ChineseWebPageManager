const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const net = require("node:net");

// Throwaway env + a stubbed ServerQuery so the file-transfer init steps run
// without a real TeamSpeak server.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-ft-"));
process.env.SESSION_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
process.env.DATA_DIR = DATA_DIR;
process.env.SESSION_FILE = path.join(DATA_DIR, "sessions.enc");
process.env.NODE_ENV = ""; // secure cookie off over test HTTP
process.env.SESSION_LOGIN_RATE_MAX = "1000";

const { TeamSpeak } = require("ts3-nodejs-library");

const DOWNLOAD_BODY = Buffer.from("hello-file-transfer-body-0123456789");
const UPLOAD_BODY = Buffer.from("upload-this-file-content-xyz");

// The ticket is issued by the server; the client never sees the raw port/ftkey.
let tcpPort = 0;
const uploadedBodies = [];

TeamSpeak.connect = async () => ({
  execute: async () => [],
  quit: async () => {},
  ftInitDownload: async () => ({
    port: tcpPort,
    ftkey: "DLKEY", // 5-byte handshake the test TCP server knows
    size: DOWNLOAD_BODY.length,
  }),
  ftInitUpload: async () => ({ port: tcpPort, ftkey: "ULKEY" }),
});

const app = require("../app");

function extractCookie(res) {
  const setCookie =
    res.headers && res.headers.get
      ? res.headers.get("set-cookie")
      : res.headers["set-cookie"];
  if (!setCookie) return null;
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return first.split(";")[0];
}

function cookieHeader(cookie) {
  return cookie ? { Cookie: cookie } : {};
}

async function waitUntil(cond, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

function startTransferServer() {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let buf = Buffer.alloc(0);
      let phase = "handshake";
      let body = null;
      let downloadMode = false;
      socket.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        if (phase === "handshake" && buf.length >= 5) {
          const ftkey = buf.subarray(0, 5).toString("ascii");
          buf = buf.subarray(5);
          phase = "body";
          downloadMode = ftkey === "DLKEY";
          if (downloadMode) {
            socket.write(DOWNLOAD_BODY);
            socket.end();
          } else {
            body = buf;
          }
        } else if (phase === "body" && !downloadMode) {
          body = body ? Buffer.concat([body, chunk]) : chunk;
        }
      });
      socket.on("end", () => {
        if (body) uploadedBodies.push(body);
        body = null;
      });
      socket.on("close", () => {
        if (body) uploadedBodies.push(body);
        body = null;
      });
      socket.on("error", () => {});
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("file transfer tickets keep the client off the raw transfer port", async (t) => {
  const tcpServer = await startTransferServer();
  tcpPort = tcpServer.address().port;
  t.after(() => tcpServer.close());

  const httpServer = http.createServer(app);
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
  t.after(() => httpServer.close());
  const base = `http://127.0.0.1:${httpServer.address().port}`;

  const loginBody = {
    host: "127.0.0.1",
    queryport: 10022,
    protocol: "ssh",
    username: "serveradmin",
    password: "secret",
    remember: false,
  };

  async function login() {
    const res = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginBody),
    });
    const cookie = extractCookie(res);
    assert.ok(cookie, "login should set a session cookie");
    return cookie;
  }

  const sessionA = await login();
  const sessionB = await login();
  assert.notStrictEqual(sessionA, sessionB);

  async function initDownload(cookie, overrides = {}) {
    const res = await fetch(`${base}/api/file-transfers/download`, {
      method: "POST",
      headers: { ...cookieHeader(cookie), "Content-Type": "application/json" },
      body: JSON.stringify({
        cid: 10,
        path: "/files/example.zip",
        cpw: "",
        ...overrides,
      }),
    });
    return { res, data: await res.json() };
  }

  async function initUpload(cookie, overrides = {}) {
    const res = await fetch(`${base}/api/file-transfers/upload`, {
      method: "POST",
      headers: { ...cookieHeader(cookie), "Content-Type": "application/json" },
      body: JSON.stringify({
        cid: 10,
        path: "/files/out.zip",
        size: UPLOAD_BODY.length,
        cpw: "",
        overwrite: 1,
        resume: 0,
        ...overrides,
      }),
    });
    return { res, data: await res.json() };
  }

  await t.test("download init returns only a ticket, never a port/ftkey", async () => {
    const { res, data } = await initDownload(sessionA);
    assert.strictEqual(res.status, 200);
    assert.ok(data.ticket, "a ticket is issued");
    assert.strictEqual(data.port, undefined, "port must not leak");
    assert.strictEqual(data.ftkey, undefined, "ftkey must not leak");
  });

  await t.test("client-supplied port/ftkey are ignored", async () => {
    const { res, data } = await initDownload(sessionA, {
      port: 9999,
      ftkey: "attacker-key",
    });
    assert.strictEqual(res.status, 200);
    assert.ok(data.ticket);
    assert.strictEqual(data.port, undefined, "client port must be ignored");
    assert.strictEqual(data.ftkey, undefined, "client ftkey must be ignored");
  });

  await t.test("download streams from the server-derived port", async () => {
    const { data } = await initDownload(sessionA);
    const res = await fetch(
      `${base}/api/file-transfers/${data.ticket}/download`,
      { headers: cookieHeader(sessionA) }
    );
    assert.strictEqual(res.status, 200);
    const body = Buffer.from(await res.arrayBuffer());
    assert.deepStrictEqual(body, DOWNLOAD_BODY);
  });

  await t.test("a consumed download ticket cannot be reused", async () => {
    const { data } = await initDownload(sessionA);
    await fetch(`${base}/api/file-transfers/${data.ticket}/download`, {
      headers: cookieHeader(sessionA),
    });
    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/download`, {
      headers: cookieHeader(sessionA),
    });
    assert.ok(res.status >= 400, "reused ticket should be rejected");
  });

  await t.test("an invalid ticket is rejected", async () => {
    const res = await fetch(
      `${base}/api/file-transfers/not-a-real-ticket/download`,
      { headers: cookieHeader(sessionA) }
    );
    assert.ok(res.status >= 400);
  });

  await t.test("a ticket cannot be used by a different session", async () => {
    const { data } = await initDownload(sessionA);
    const res = await fetch(
      `${base}/api/file-transfers/${data.ticket}/download`,
      { headers: cookieHeader(sessionB) }
    );
    assert.strictEqual(res.status, 403, "session mismatch is forbidden");
  });

  await t.test("upload init returns a ticket", async () => {
    const { res, data } = await initUpload(sessionA);
    assert.strictEqual(res.status, 200);
    assert.ok(data.ticket);
    assert.strictEqual(data.port, undefined, "port must not leak");
    assert.strictEqual(data.ftkey, undefined, "ftkey must not leak");
  });

  await t.test("upload forwards the bytes to the server-derived port", async () => {
    const before = uploadedBodies.length;
    const { data } = await initUpload(sessionA);

    const formData = new FormData();
    formData.append("file", new Blob([UPLOAD_BODY]), "out.zip");

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.strictEqual(res.status, 200);

    const ok = await waitUntil(() => uploadedBodies.length > before);
    assert.ok(ok, "the TCP transfer server should have received the upload");
    const received = uploadedBodies[uploadedBodies.length - 1];
    assert.deepStrictEqual(received, UPLOAD_BODY);
  });

  await t.test("upload without a file field is rejected (400)", async () => {
    const { data } = await initUpload(sessionA);

    const formData = new FormData();
    formData.append("other", "not-a-file");

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.strictEqual(res.status, 400, "missing file should be 400");
  });

  await t.test("upload with too many file fields is rejected (400)", async () => {
    const { data } = await initUpload(sessionA);

    const formData = new FormData();
    formData.append("file", new Blob(["a"]), "a.bin");
    formData.append("file", new Blob(["b"]), "b.bin");

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.strictEqual(res.status, 400, "a second file should be 400");
  });

  await t.test("upload with a wrong/missing content-type is rejected (400)", async () => {
    const { data } = await initUpload(sessionA);

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: {
        ...cookieHeader(sessionA),
        "Content-Type": "text/plain",
      },
      body: "not multipart",
    });
    assert.strictEqual(res.status, 400, "bad content-type should be 400");
  });

  await t.test("the server keeps serving after malformed transfer requests", async () => {
    const res = await fetch(`${base}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ok");
  });
});
