const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Production mode so Secure cookies and the Origin/CSRF guard are active.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-secs-"));
process.env.SESSION_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
process.env.DATA_DIR = DATA_DIR;
process.env.SESSION_FILE = path.join(DATA_DIR, "sessions.enc");
process.env.NODE_ENV = "production";
process.env.SESSION_LOGIN_RATE_MAX = "1000";
// Leave SESSION_COOKIE_SECURE unset so Secure defaults to enabled in production.

const { TeamSpeak } = require("ts3-nodejs-library");
TeamSpeak.connect = async () => ({ quit: async () => {} });

const app = require("../app");
const http = require("node:http");

let server;
let base;

function extractCookie(res) {
  const setCookie =
    res.headers && res.headers.get
      ? res.headers.get("set-cookie")
      : res.headers["set-cookie"];
  if (!setCookie) return null;
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return first.split(";")[0];
}

test("release checks: cookie attributes, origin guard and health", async (t) => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  t.after(() => server.close());
  base = `http://127.0.0.1:${server.address().port}`;

  await t.test("health is served without authentication", async () => {
    const res = await fetch(`${base}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ok");
  });

  await t.test("session cookie carries Secure, HttpOnly and SameSite=Strict", async () => {
    const res = await fetch(`${base}/api/session/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "ts3.example.com",
        queryport: 10022,
        protocol: "ssh",
        username: "serveradmin",
        password: "secret",
        remember: false,
      }),
    });
    assert.strictEqual(res.status, 200);

    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie, "a session cookie should be set");
    assert.match(setCookie, /ts3_session=/);
    assert.match(setCookie, /HttpOnly/i, "cookie must be HttpOnly");
    assert.match(setCookie, /Secure/i, "cookie must be Secure in production");
    assert.match(setCookie, /SameSite=Strict/i, "cookie must be SameSite=Strict");
    assert.match(setCookie, /Path=\//i, "cookie path must be /");
  });

  await t.test("a state-changing request from a non-trusted Origin is rejected (403)", async () => {
    const res = await fetch(`${base}/api/session/logout`, {
      method: "POST",
      headers: { Origin: "https://evil.example.com" },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.message, "来源站点不受信任");
  });

  await t.test("a same-origin state-changing request is allowed", async () => {
    const res = await fetch(`${base}/api/session/logout`, {
      method: "POST",
      headers: { Origin: base },
    });
    assert.notStrictEqual(res.status, 403);
  });
});
