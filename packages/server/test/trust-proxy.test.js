const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Use a throwaway data dir so the session module does not write into the repo.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-tp-"));
process.env.SESSION_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
process.env.DATA_DIR = DATA_DIR;
process.env.SESSION_FILE = path.join(DATA_DIR, "sessions.enc");

// TRUST_PROXY=yes (not "1") is what proves app.js now delegates to the shared
// trustProxyEnabled() decision rather than the previous `=== "1"` check.
process.env.TRUST_PROXY = "yes";

const { trustProxyEnabled } = require("../utils");
const { resolveClientIp } = require("../utils/ip");
const app = require("../app");

function setEnv(value) {
  if (value === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = value;
}

test("app.js enables trust proxy via the shared trustProxyEnabled() decision", () => {
  // "yes" is trusted by trustProxyEnabled() but was historically NOT matched by
  // the old `process.env.TRUST_PROXY === "1"` check, so this confirms app.js is
  // wired to the shared policy.
  assert.strictEqual(app.get("trust proxy"), 1);
});

test("trustProxyEnabled() value matrix", () => {
  setEnv(undefined);
  assert.strictEqual(trustProxyEnabled(), false, "unset -> off");

  setEnv("0");
  assert.strictEqual(trustProxyEnabled(), false, "0 -> off");

  setEnv("false");
  assert.strictEqual(trustProxyEnabled(), false, "false -> off");

  setEnv("1");
  assert.strictEqual(trustProxyEnabled(), true, "1 -> on");

  setEnv("true");
  assert.strictEqual(trustProxyEnabled(), true, "true -> on");

  setEnv("yes");
  assert.strictEqual(trustProxyEnabled(), true, "yes -> on");
});

test("malformed values default the proxy trust off", () => {
  for (const value of ["2", "foo", "TRUE", "on", ""]) {
    setEnv(value);
    assert.strictEqual(trustProxyEnabled(), false, `value "${value}" -> off`);
  }
});

test("resolveClientIp shares the same gate (HTTP and Socket both use it)", () => {
  const remote = "10.0.0.1";
  const xff = "203.0.113.9";

  // Not trusted -> X-Forwarded-For ignored (shared rate-limit bucket).
  for (const value of [undefined, "0", "false", "2", "foo"]) {
    setEnv(value);
    assert.strictEqual(
      resolveClientIp({ remoteAddress: remote, xForwardedFor: xff }),
      remote,
      `value "${value}" should use remoteAddress`
    );
  }

  // Trusted -> the client address inside the chain is used.
  for (const value of ["1", "true", "yes"]) {
    setEnv(value);
    assert.strictEqual(
      resolveClientIp({ remoteAddress: remote, xForwardedFor: xff }),
      xff,
      `value "${value}" should use the forwarded client address`
    );
  }
});
