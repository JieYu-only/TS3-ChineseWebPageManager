const test = require("node:test");
const assert = require("node:assert");

const { resolveClientIp } = require("../utils/ip");

function withoutTrustProxy() {
  delete process.env.TRUST_PROXY;
  delete process.env.TRUSTED_PROXY_HOPS;
}

function withTrustProxy(hop = "1") {
  process.env.TRUST_PROXY = "1";
  process.env.TRUSTED_PROXY_HOPS = hop;
}

test("ip: without TRUST_PROXY a forged X-Forwarded-For does not change the key", () => {
  withoutTrustProxy();
  const remote = "203.0.113.7";

  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "1.1.1.1" }),
    remote
  );
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "2.2.2.2" }),
    remote
  );
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "8.8.8.8, 9.9.9.9" }),
    remote
  );
  assert.strictEqual(resolveClientIp({ remoteAddress: remote }), remote);
});

test("ip: with TRUST_PROXY the trusted-chain client address is used and normalized", () => {
  withTrustProxy("1");
  const remote = "10.0.0.1";

  // Single entry: the proxy's view of the client.
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "203.0.113.9" }),
    "203.0.113.9"
  );
  // Whitespace around entries is normalised and the rightmost (the address the
  // trusted proxy appended) is chosen, ignoring a spoofed leftmost entry.
  assert.strictEqual(
    resolveClientIp({
      remoteAddress: remote,
      xForwardedFor: "1.2.3.4, 198.51.100.7, 203.0.113.9",
    }),
    "203.0.113.9"
  );
  // Leading/trailing whitespace is stripped.
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "  203.0.113.9  " }),
    "203.0.113.9"
  );
});

test("ip: with TRUST_PROXY, extra trusted hops skip more addresses", () => {
  withTrustProxy("2");
  const remote = "10.0.0.1";

  // With two trusted hops, skip the last two entries (the proxies), so the
  // client is the one just before them.
  assert.strictEqual(
    resolveClientIp({
      remoteAddress: remote,
      xForwardedFor: "203.0.113.9, 198.51.100.7, 10.0.0.1",
    }),
    "198.51.100.7"
  );
});

test("ip: missing or malformed forwarding header falls back to remoteAddress", () => {
  withTrustProxy("1");
  const remote = "10.0.0.1";

  assert.strictEqual(resolveClientIp({ remoteAddress: remote }), remote);
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "" }),
    remote
  );
  // Not a valid IP, so it is ignored and treated as untrusted/malformed.
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "not-an-ip" }),
    remote
  );
  // More trusted hops than available entries -> fall back.
  withTrustProxy("5");
  assert.strictEqual(
    resolveClientIp({ remoteAddress: remote, xForwardedFor: "203.0.113.9" }),
    remote
  );
});
