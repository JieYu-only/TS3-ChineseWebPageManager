const test = require("node:test");
const assert = require("node:assert");

const { TicketStore, hashTicket } = require("../utils/fileTransferTickets");

const SESSION_A = "session-a";
const SESSION_B = "session-b";

function makeTicket(store, overrides = {}) {
  return store.create({
    sessionId: SESSION_A,
    direction: "download",
    host: "ts3.example.com",
    port: 30033,
    ftkey: "key",
    expectedSize: 100,
    fileName: "example.zip",
    ...overrides,
  });
}

test("ticket: create returns a unique raw value of at least 32 bytes", () => {
  const store = new TicketStore();
  const a = makeTicket(store);
  const b = makeTicket(store);
  const c = makeTicket(store);

  assert.notStrictEqual(a.raw, b.raw);
  assert.notStrictEqual(a.raw, c.raw);
  assert.ok(Buffer.byteLength(a.raw, "base64url") >= 32);
  assert.match(a.raw, /^[A-Za-z0-9_-]+$/);
});

test("ticket: hashTicket is deterministic", () => {
  assert.strictEqual(hashTicket("abc"), hashTicket("abc"));
  assert.strictEqual(hashTicket("abc").length, 64);
});

test("ticket: validate accepts a matching session and direction", () => {
  const store = new TicketStore();
  const { raw } = makeTicket(store);

  const ticket = store.validate(raw, {
    sessionId: SESSION_A,
    direction: "download",
  });
  assert.strictEqual(ticket.direction, "download");
  assert.strictEqual(ticket.host, "ts3.example.com");
});

test("ticket: validate rejects an unknown raw value", () => {
  const store = new TicketStore();
  assert.throws(() =>
    store.validate("not-a-real-ticket", {
      sessionId: SESSION_A,
      direction: "download",
    })
  );
});

test("ticket: validate rejects an expired ticket", () => {
  const store = new TicketStore({ ttlMs: 1000 });
  const { raw } = makeTicket(store);

  // Force expiration.
  const hash = hashTicket(raw);
  store.tickets.get(hash).expiresAt = Date.now() - 1000;

  assert.throws(() =>
    store.validate(raw, { sessionId: SESSION_A, direction: "download" })
  );
  // Expired tickets are evicted.
  assert.strictEqual(store.tickets.has(hash), false);
});

test("ticket: consume can only be used once", () => {
  const store = new TicketStore();
  const { raw } = makeTicket(store);

  const ticket = store.consume(raw, {
    sessionId: SESSION_A,
    direction: "download",
  });
  assert.strictEqual(ticket.used, true);

  assert.throws(() =>
    store.validate(raw, { sessionId: SESSION_A, direction: "download" })
  );
});

test("ticket: validate rejects a session mismatch", () => {
  const store = new TicketStore();
  const { raw } = makeTicket(store);

  assert.throws(() =>
    store.validate(raw, { sessionId: SESSION_B, direction: "download" })
  );
});

test("ticket: validate rejects a direction mismatch", () => {
  const store = new TicketStore();
  const { raw } = makeTicket(store);

  assert.throws(() =>
    store.validate(raw, { sessionId: SESSION_A, direction: "upload" })
  );
});

test("ticket: delete invalidates a ticket", () => {
  const store = new TicketStore();
  const { raw } = makeTicket(store);

  store.delete(raw);
  assert.throws(() =>
    store.validate(raw, { sessionId: SESSION_A, direction: "download" })
  );
});

test("ticket: purge removes expired tickets", () => {
  const store = new TicketStore({ ttlMs: 1000 });
  const { raw } = makeTicket(store);

  const hash = hashTicket(raw);
  store.tickets.get(hash).expiresAt = Date.now() - 1000;

  const removed = store.purge();
  assert.strictEqual(removed, 1);
  assert.strictEqual(store.size(), 0);
});
