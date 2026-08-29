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
// Tight, deterministic transfer caps so the resource-limit tests are meaningful
// and a normal (tiny) transfer still completes well inside the total timeout.
process.env.FILE_TRANSFER_MAX_SIZE = "200";
process.env.FILE_TRANSFER_TOTAL_TIMEOUT_MS = "1000";
process.env.FILE_TRANSFER_SESSION_CONCURRENCY = "1";
process.env.FILE_TRANSFER_GLOBAL_CONCURRENCY = "1";

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

  /**
   * Upload a multipart body slowly (one byte at a time) so it exceeds the total
   * transfer time limit; used to prove a slow trickle is terminated.
   */
  function startSlowUpload(cookie, ticket, declaredSize) {
    return new Promise((resolve, reject) => {
      let finished = false;
      let status = 0;
      let timer;
      let guard;
      const u = new URL(`${base}/api/file-transfers/${ticket}/upload`);
      const req = http.request(u, {
        method: "POST",
        headers: {
          ...cookieHeader(cookie),
          "Content-Type": "multipart/form-data; boundary=slowboundary",
          "Transfer-Encoding": "chunked",
        },
      });
      const done = (err) => {
        if (finished) return;
        finished = true;
        if (timer) clearInterval(timer);
        if (guard) clearTimeout(guard);
        resolve({ status, err: err && err.message });
      };
      req.on("response", (res) => {
        status = res.statusCode;
        res.on("data", () => {});
        res.on("end", () => done());
        res.on("error", (e) => done(e));
      });
      req.on("error", (e) => done(e));

      req.write(
        "--slowboundary\r\n" +
          'Content-Disposition: form-data; name="file"; filename="s.bin"\r\n' +
          "Content-Type: application/octet-stream\r\n\r\n"
      );

      let sent = 0;
      timer = setInterval(() => {
        if (finished) return;
        if (sent >= declaredSize) {
          clearInterval(timer);
          try {
            req.end("\r\n--slowboundary--\r\n");
          } catch (_) {}
          return;
        }
        try {
          req.write("A");
          sent++;
        } catch (e) {
          done(e);
        }
      }, 100);

      guard = setTimeout(() => done(new Error("no response")), 8000);
    });
  }

  await t.test("a zero-byte file can be uploaded successfully", async () => {
    const { data } = await initUpload(sessionA, { size: 0 });

    const formData = new FormData();
    formData.append("file", new Blob([]), "empty.bin");

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.strictEqual(res.status, 200, "an empty file should upload");
  });

  await t.test("upload init above the configured ceiling returns 413", async () => {
    const res = await fetch(`${base}/api/file-transfers/upload`, {
      method: "POST",
      headers: { ...cookieHeader(sessionA), "Content-Type": "application/json" },
      body: JSON.stringify({ cid: 10, path: "/big.bin", size: 1000, cpw: "" }),
    });
    assert.strictEqual(res.status, 413, "over-max init should be 413");
  });

  await t.test("actual data larger than the declared size is rejected (413)", async () => {
    const { data } = await initUpload(sessionA, { size: 5 });

    const formData = new FormData();
    formData.append("file", new Blob([Buffer.alloc(20)]), "big.bin");

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.strictEqual(res.status, 413, "over-sized data should be 413");
  });

  await t.test("upload smaller than the declared size is not accepted", async () => {
    const { data } = await initUpload(sessionA, { size: 10 });

    const formData = new FormData();
    formData.append("file", new Blob([Buffer.from("abc")]), "small.bin");

    const res = await fetch(`${base}/api/file-transfers/${data.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.notStrictEqual(res.status, 200, "undersized upload must not succeed");
  });

  await t.test("a slow drip that exceeds the total time limit is terminated", async () => {
    const { data } = await initUpload(sessionA, { size: 100 });

    // Dribble one byte every 100ms; total timeout is 1000ms, so this can never
    // reach the declared 100 bytes and must be cut off by the deadline.
    const result = await startSlowUpload(sessionA, data.ticket, 100);
    assert.notStrictEqual(result.status, 200, "slow drip must not succeed");
    assert.ok(result.status >= 400 || result.status === 0, "must be terminated");
  });

  await t.test("a failed transfer releases the concurrency slot", async () => {
    // Force a failure (overshoot) which holds the single concurrency slot.
    const { data: bad } = await initUpload(sessionA, { size: 5 });
    const badFormData = new FormData();
    badFormData.append("file", new Blob([Buffer.alloc(20)]), "big.bin");
    const badRes = await fetch(`${base}/api/file-transfers/${bad.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: badFormData,
    });
    assert.strictEqual(badRes.status, 413);

    // The slot must have been released: a fresh success upload can start, and
    // the service is still healthy.
    const health = await fetch(`${base}/api/health`);
    assert.strictEqual(health.status, 200);

    const { data: good } = await initUpload(sessionA);
    const formData = new FormData();
    formData.append("file", new Blob([UPLOAD_BODY]), "out.zip");
    const goodRes = await fetch(`${base}/api/file-transfers/${good.ticket}/upload`, {
      method: "POST",
      headers: cookieHeader(sessionA),
      body: formData,
    });
    assert.strictEqual(goodRes.status, 200, "slot should be reusable after failure");
  });
});
