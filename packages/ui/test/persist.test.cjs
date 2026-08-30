const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePersistedState } = require("../src/store/persistValidation.cjs");

const VERSION = 1;

test("restores only the valid persisted settings and chat fields", () => {
  const result = parsePersistedState(
    JSON.stringify({
      __version: VERSION,
      state: {
        settings: {
          rememberLogin: false,
          notifications: true,
          darkMode: true,
          unexpected: "discarded",
        },
        chat: { messages: [{ text: "hello" }], unexpected: true },
        query: { queryUser: "must not be restored" },
      },
    }),
    VERSION
  );

  assert.deepEqual(result, {
    settings: {
      rememberLogin: false,
      notifications: true,
      darkMode: true,
    },
    chat: { messages: [{ text: "hello" }] },
  });
});

test("rejects invalid JSON", () => {
  assert.equal(parsePersistedState("{broken", VERSION), null);
});

test("rejects a payload from another schema version", () => {
  const raw = JSON.stringify({ __version: VERSION - 1, state: {} });
  assert.equal(parsePersistedState(raw, VERSION), null);
});

test("discards malformed fields and modules instead of overriding defaults", () => {
  const result = parsePersistedState(
    {
      __version: VERSION,
      state: {
        settings: {
          rememberLogin: "yes",
          notifications: false,
          darkMode: {},
        },
        chat: { messages: "not-an-array" },
      },
    },
    VERSION
  );

  assert.deepEqual(result, { settings: { notifications: false } });
});
