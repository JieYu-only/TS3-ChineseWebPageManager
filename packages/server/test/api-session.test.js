const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Deterministic throwaway env + a stubbed ServerQuery connection so login can
// be exercised without a real TeamSpeak server.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-api-"));
process.env.SESSION_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
process.env.DATA_DIR = DATA_DIR;
process.env.SESSION_FILE = path.join(DATA_DIR, "sessions.enc");
process.env.NODE_ENV = ""; // ensure Secure cookie is off over test HTTP

const { TeamSpeak } = require("ts3-nodejs-library");
// Stub the connection + quit used by the login endpoint.
TeamSpeak.connect = async () => ({ quit: async () => {} });

const app = require("../app");
const http = require("node:http");

let server;
let base;

function extractCookie(res) {
  const setCookie = res.headers && res.headers.get
    ? res.headers.get("set-cookie")
    : res.headers["set-cookie"];
  if (!setCookie) return null;
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return first.split(";")[0];
}

function cookieHeader(cookie) {
  return cookie ? { Cookie: cookie } : {};
}

test("api: session endpoints", async (t) => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  base = `http://127.0.0.1:${server.address().port}`;

  const loginBody = {
    host: "ts3.example.com",
    queryport: 10022,
    protocol: "ssh",
    username: "serveradmin",
    password: "secret",
    remember: false,
  };

  await t.test("status is disconnected without a cookie", async () => {
    const res = await fetch(`${base}/api/session/status`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.connected, false);
  });

  await t.test("login succeeds and sets an HttpOnly session cookie", async () => {
    const res = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginBody),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.connected, true);
    assert.ok(data.expiresAt > Date.now());

    const setCookie = extractCookie(res);
    assert.ok(setCookie && setCookie.startsWith("ts3_session="), "session cookie set");
    assert.match(res.headers.get("set-cookie"), /HttpOnly/i);
    // Remembered=false -> no explicit maxAge (session cookie).
    assert.doesNotMatch(res.headers.get("set-cookie"), /max-age/i);
  });

  await t.test("login with an invalid host is rejected (401)", async () => {
    const res = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...loginBody, host: "" }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.connected, false);
  });

  await t.test("status reflects a valid session cookie", async () => {
    const login = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...loginBody, remember: true }),
    });
    const cookie = extractCookie(login);

    assert.ok(cookie);

    // Remembered login should have a maxAge cookie.
    assert.match(login.headers.get("set-cookie"), /max-age/i);

    const res = await fetch(`${base}/api/session/status`, {
      headers: cookieHeader(cookie),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.connected, true);
  });

  await t.test("selected virtual server is persisted in the session", async () => {
    const login = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...loginBody, remember: true }),
    });
    const cookie = extractCookie(login);

    const update = await fetch(`${base}/api/session/server`, {
      method: "PATCH",
      headers: {
        ...cookieHeader(cookie),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serverId: 7 }),
    });
    assert.strictEqual(update.status, 200);
    assert.deepStrictEqual(await update.json(), { serverId: "7" });

    const status = await fetch(`${base}/api/session/status`, {
      headers: cookieHeader(cookie),
    });
    const statusData = await status.json();
    assert.strictEqual(statusData.serverId, "7");
  });

  await t.test("server selection update requires a valid session", async () => {
    const res = await fetch(`${base}/api/session/server`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId: 1 }),
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test("logout invalidates the session and clears the cookie", async () => {
    const login = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginBody),
    });
    const cookie = extractCookie(login);
    assert.ok(cookie);

    const logout = await fetch(`${base}/api/session/logout`, {
      method: "POST",
      headers: cookieHeader(cookie),
    });
    const logoutData = await logout.json();
    assert.strictEqual(logoutData.connected, false);

    const status = await fetch(`${base}/api/session/status`, {
      headers: cookieHeader(cookie),
    });
    const statusData = await status.json();
    assert.strictEqual(statusData.connected, false, "session invalid after logout");
  });

  await t.test("file download is blocked without a session", async () => {
    const res = await fetch(`${base}/api/download?ftkey=x&size=1&name=a&port=1`);
    assert.strictEqual(res.status, 401);
  });
});
