"use strict";

const net = require("net");

/**
 * Whether reverse-proxy forwarding is trusted (TRUST_PROXY=1). This matches the
 * Express `app.set("trust proxy", ...)` gate in app.js, so HTTP and Socket.IO
 * use the same policy.
 * @returns {boolean}
 */
function trustProxyEnabled() {
  const v = process.env.TRUST_PROXY;
  return v === "1" || v === "true" || v === "yes";
}

/** Number of trusted proxy hops to skip when TRUST_PROXY is enabled. */
function trustedProxyHops() {
  const v = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isSafeInteger(v) && v > 0 ? v : 1;
}

function normalizeIp(ip) {
  return String(ip || "").trim();
}

/**
 * Split a comma-separated X-Forwarded-For header into cleaned, non-empty items.
 * @param {string|string[]|undefined} xff
 * @returns {string[]}
 */
function parseXForwardedFor(xff) {
  if (!xff) return [];
  const raw = Array.isArray(xff) ? xff.join(",") : String(xff);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Resolve the client IP used for logging and rate-limiting.
 *
 * When TRUST_PROXY is not enabled the X-Forwarded-For header is ignored
 * entirely and the underlying TCP remoteAddress is used, so a client cannot
 * bypass a shared rate-limit by injecting a different forwarding header.
 *
 * When enabled, the comma-separated header is parsed and the address inside the
 * trusted proxy chain is selected (the hop the trusted proxy observed). Missing
 * or malformed headers fall back to the remoteAddress.
 *
 * @param {{ remoteAddress?: string, xForwardedFor?: string|string[] }} opts
 * @returns {string}
 */
function resolveClientIp({ remoteAddress, xForwardedFor }) {
  const remote = normalizeIp(remoteAddress);

  if (!trustProxyEnabled()) return remote || "unknown";

  const hops = trustedProxyHops();
  const list = parseXForwardedFor(xForwardedFor);
  if (list.length === 0) return remote || "unknown";

  const idx = list.length - hops;
  if (idx < 0) return remote || "unknown";

  const candidate = list[idx];
  // Only accept an address it can actually be (defence against a malformed
  // header that otherwise could influence the rate-limit bucket).
  if (net.isIP(candidate) === 0) return remote || "unknown";

  return candidate;
}

module.exports = { resolveClientIp, trustProxyEnabled };
