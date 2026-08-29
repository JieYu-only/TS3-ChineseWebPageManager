const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Set the encryption key + data dir BEFORE requiring any session module so a
// deterministic, throwaway environment is used.
const TEST_KEY = crypto.randomBytes(32).toString("base64");
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ts3-session-"));
process.env.SESSION_ENCRYPTION_KEY = TEST_KEY;
process.env.DATA_DIR = DATA_DIR;
process.env.SESSION_FILE = path.join(DATA_DIR, "sessions.enc");
// Test the per-account cap with a small, deterministic ceiling.
process.env.SESSION_MAX_ACTIVE_PER_ACCOUNT = "3";

const { encryptValue, decryptValue } = require("../session/credentialCrypto");
const SessionManager = require("../session/SessionManager");
const MemorySessionStore = require("../session/MemorySessionStore");
const EncryptedFileSessionStore = require("../session/EncryptedFileSessionStore");

const credentials = {
  host: "ts3.example.com",
  queryport: 10022,
  protocol: "ssh",
  username: "serveradmin",
  password: "superSecret",
};

test("SessionManager.createSessionId returns unique 256-bit base64url ids", () => {
  const a = SessionManager.createSessionId();
  const b = SessionManager.createSessionId();

  assert.notStrictEqual(a, b);
  assert.ok(a.length >= 43, "base64url of 32 bytes is >= 43 chars");
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test("SessionManager.hashSessionId is sha256 and deterministic", () => {
  const h1 = SessionManager.hashSessionId("abc");
  const h2 = SessionManager.hashSessionId("abc");

  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 64);
});

const sample = { foo: "bar", list: [1, 2, 3], nested: { x: true } };

test("AES-256-GCM encrypt/decrypt round-trips arbitrary JSON", () => {
  const encrypted = encryptValue(sample);
  const decrypted = decryptValue(encrypted);

  assert.deepStrictEqual(decrypted, sample);
  assert.strictEqual(decrypted.foo, "bar");
});

test("A wrong encryption key fails to decrypt", () => {
  const encrypted = encryptValue(sample);
  const otherKey = crypto.randomBytes(32).toString("base64");

  const previous = process.env.SESSION_ENCRYPTION_KEY;
  process.env.SESSION_ENCRYPTION_KEY = otherKey;

  assert.throws(() => decryptValue(encrypted));

  process.env.SESSION_ENCRYPTION_KEY = previous;
});

test("Tampering with ciphertext or auth tag fails to decrypt", () => {
  const encrypted = encryptValue(sample);

  const tamperedData = { ...encrypted, data: btoa("changed") };
  assert.throws(() => decryptValue(tamperedData));

  const tamperedTag = { ...encrypted, tag: Buffer.from([0]).toString("base64") };
  assert.throws(() => decryptValue(tamperedTag));
});

test("Temporary sessions live only in memory (not on disk)", () => {
  const manager = new SessionManager({});
  const session = manager.create({ credentials, remember: false });

  // No file should be written for a temporary session, or if one exists it must
  // not reference this session id.
  if (fs.existsSync(process.env.SESSION_FILE)) {
    const fileRaw = fs.readFileSync(process.env.SESSION_FILE, "utf8");
    assert.ok(!fileRaw.includes(SessionManager.hashSessionId(session.id)));
  } else {
    assert.ok(true, "no session file written for a temporary session");
  }
});

test("Remembered sessions are persisted to the encrypted file", () => {
  const store = new EncryptedFileSessionStore(process.env.SESSION_FILE);
  const session = new SessionManager({ encryptedStore: store }).create({
    credentials,
    remember: true,
  });

  const found = store.get(session.id);
  assert.ok(found, "remembered session should be readable from the encrypted store");
  assert.deepStrictEqual(found.credentials, credentials);
});

test("get() returns null for unknown or expired sessions", () => {
  const memory = new MemorySessionStore();
  const manager = new SessionManager({ memoryStore: memory });

  const session = manager.create({ credentials, remember: false });
  // Absolute-expire it immediately.
  session.expiresAt = Date.now() - 1000;
  memory.set(session);

  assert.strictEqual(manager.get(session.id), null);
  assert.strictEqual(manager.get("does-not-exist"), null);
});

test("Idle expiry: session not used beyond idle ttl is removed", () => {
  // Any non-remembered session idle > 8h is expired.
  const memory = new MemorySessionStore();
  const manager = new SessionManager({ memoryStore: memory });

  const session = manager.create({ credentials, remember: false });
  session.lastUsedAt = Date.now() - 9 * 60 * 60 * 1000; // 9 hours idle
  memory.set(session);

  assert.strictEqual(manager.get(session.id), null);
});

test("delete() removes the session", () => {
  const memory = new MemorySessionStore();
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "sess2.enc"));
  const manager = new SessionManager({ memoryStore: memory, encryptedStore: store });

  const session = manager.create({ credentials, remember: true });
  assert.ok(manager.get(session.id));

  manager.delete(session.id);
  assert.strictEqual(manager.get(session.id), null);
  assert.strictEqual(store.get(session.id), null);
});

test("deleteExpired() purges only expired sessions", () => {
  const memory = new MemorySessionStore();
  const manager = new SessionManager({ memoryStore: memory });

  const fresh = manager.create({ credentials, remember: false });
  const stale = manager.create({ credentials, remember: false });
  stale.expiresAt = Date.now() - 1000;
  memory.set(stale);

  const removed = manager.deleteExpired();
  assert.ok(removed >= 1);
  assert.ok(manager.get(fresh.id), "fresh session should survive");
  assert.strictEqual(manager.get(stale.id), null);
});

test("get() refreshes lastUsedAt", () => {
  const memory = new MemorySessionStore();
  const manager = new SessionManager({ memoryStore: memory });

  const session = manager.create({ credentials, remember: false });
  session.lastUsedAt = Date.now() - 60 * 60 * 1000;
  memory.set(session);

  const refreshed = manager.get(session.id);
  assert.ok(refreshed.lastUsedAt >= Date.now() - 1000);
});

test("remembered session survives idling past the temp ttl but not past its own", () => {
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "idle.enc"));
  const manager = new SessionManager({ encryptedStore: store });
  const session = manager.create({ credentials, remember: true });

  // 9h idle: inside the 30-day remembered idle TTL -> still recoverable.
  session.lastUsedAt = Date.now() - 9 * 60 * 60 * 1000;
  store.set(session);
  manager.memory.clear();

  const recovered = manager.get(session.id);
  assert.ok(recovered, "remembered session should be recoverable after 9h idle");

  // 31d idle: past the remembered idle TTL -> expired.
  session.lastUsedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
  store.set(session);
  manager.memory.clear();

  assert.strictEqual(manager.get(session.id), null);
});

test("get() does not re-persist a remembered session within the throttle window", () => {
  const file = path.join(DATA_DIR, "throttle.enc");
  const store = new EncryptedFileSessionStore(file);
  const manager = new SessionManager({ encryptedStore: store });
  const session = manager.create({ credentials, remember: true });

  // Simulate an older on-disk state (lastUsedAt one hour ago), then persist it.
  session.lastUsedAt = Date.now() - 60 * 60 * 1000;
  store.set(session);
  manager.memory.clear();

  const inMemory = manager.get(session.id);
  assert.ok(inMemory.lastUsedAt >= Date.now() - 1000, "in-memory lastUsedAt refreshed");

  // A fresh store built from the file must NOT see the refreshed lastUsedAt,
  // proving get() did not synchronously write to disk within the throttle window.
  const fromDisk = new EncryptedFileSessionStore(file).get(session.id);
  assert.ok(
    fromDisk.lastUsedAt < Date.now() - 30 * 1000,
    "disk copy kept the pre-read lastUsedAt"
  );
});

test("remembered session activity and server selection persist to disk", () => {
  const file = path.join(DATA_DIR, "activity.enc");
  const store = new EncryptedFileSessionStore(file);
  const manager = new SessionManager({ encryptedStore: store });
  const session = manager.create({ credentials, remember: true });

  session.lastUsedAt = Date.now() - 60 * 60 * 1000;
  store.set(session);
  manager.memory.clear();

  const refreshed = manager.get(session.id);
  assert.ok(refreshed.lastUsedAt >= Date.now() - 1000);
  manager.updateServerId(session.id, 9);

  const reloaded = new EncryptedFileSessionStore(file).get(session.id);
  assert.ok(reloaded.lastUsedAt >= Date.now() - 1000);
  assert.strictEqual(reloaded.serverId, "9");
});

test("No password is written to the encrypted file in plaintext", () => {
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "sess3.enc"));
  const session = new SessionManager({ encryptedStore: store }).create({
    credentials,
    remember: true,
  });

  const raw = fs.readFileSync(path.join(DATA_DIR, "sess3.enc"), "utf8");
  // The file must not contain the plaintext password, host, or username.
  assert.ok(!raw.includes(credentials.password));
  assert.ok(!raw.includes(credentials.host));
  assert.ok(!raw.includes(credentials.username));
});

test("startCleanup/stopCleanup manage the periodic timer", () => {
  const manager = new SessionManager({});
  assert.doesNotThrow(() => manager.startCleanup(60 * 60 * 1000));
  assert.doesNotThrow(() => manager.stopCleanup());
});

test("a remembered session present in both stores is counted once", () => {
  const memory = new MemorySessionStore();
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "dup.enc"));
  const manager = new SessionManager({
    memoryStore: memory,
    encryptedStore: store,
  });

  const session = manager.create({ credentials, remember: true });
  const account = `${credentials.host}:${credentials.username}`;

  // The same session object is reachable from BOTH stores.
  assert.ok(memory.has(session.id));
  assert.ok(store.has(session.id));

  // But _sessionsForAccount must only count it once.
  assert.strictEqual(manager._sessionsForAccount(account).length, 1);
});

test("no eviction before the per-account cap is reached", () => {
  const memory = new MemorySessionStore();
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "noevict.enc"));
  const manager = new SessionManager({ memoryStore: memory, encryptedStore: store });
  const account = `${credentials.host}:${credentials.username}`;

  const a = manager.create({ credentials, remember: false });
  const b = manager.create({ credentials, remember: false });

  assert.ok(memory.has(a.id));
  assert.ok(memory.has(b.id));
  assert.strictEqual(manager._sessionsForAccount(account).length, 2);
});

test("evicts only the oldest session when the account cap is reached", () => {
  const memory = new MemorySessionStore();
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "evict.enc"));
  const manager = new SessionManager({ memoryStore: memory, encryptedStore: store });
  const account = `${credentials.host}:${credentials.username}`;

  const a = manager.create({ credentials, remember: false });
  const b = manager.create({ credentials, remember: false });
  const c = manager.create({ credentials, remember: false });

  // Force `a` to be the oldest by last-used timestamp.
  a.lastUsedAt = Date.now() - 60 * 1000;
  memory.set(a);

  // Creating a fourth session for the same account should evict exactly one.
  const d = manager.create({ credentials, remember: false });

  assert.strictEqual(memory.has(a.id), false, "oldest session evicted");
  assert.ok(memory.has(b.id));
  assert.ok(memory.has(c.id));
  assert.ok(memory.has(d.id));
  assert.strictEqual(manager._sessionsForAccount(account).length, 3);
});

test("accounts are separated by host and username", () => {
  const memory = new MemorySessionStore();
  const store = new EncryptedFileSessionStore(path.join(DATA_DIR, "accounts.enc"));
  const manager = new SessionManager({ memoryStore: memory, encryptedStore: store });

  manager.create({ credentials: { ...credentials, username: "userA" }, remember: false });
  manager.create({ credentials: { ...credentials, username: "userB" }, remember: false });
  manager.create({ credentials: { ...credentials, host: "other.example.com" }, remember: false });

  // Same host, different usernames -> separate accounts.
  assert.strictEqual(manager._sessionsForAccount(`${credentials.host}:userA`).length, 1);
  assert.strictEqual(manager._sessionsForAccount(`${credentials.host}:userB`).length, 1);
  // Different host, same username -> separate account.
  assert.strictEqual(manager._sessionsForAccount("other.example.com:serveradmin").length, 1);
  // No account should have mixed entries.
  assert.strictEqual(manager._sessionsForAccount(`${credentials.host}:serveradmin`).length, 0);
});
