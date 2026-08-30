import SecureLS from "secure-ls";

const ls = new SecureLS({ isCompression: false });

// Storage payload version. Bump it whenever the whitelist or the shape of a
// persisted module changes so stale payloads are discarded instead of merged.
const STORAGE_KEY = "ts3-manager-state";
const VERSION = 1;

// Only genuinely user-retained runtime state is persisted. Credentials, session
// tokens, session ids and TeamSpeak passwords must never be written to browser
// storage, so session/query fields (restored from the server-side session) and
// authentication state are intentionally excluded.
const WHITELIST = ["settings", "chat"];

function getStorage() {
  if (process.env.NODE_ENV === "development") {
    return {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    };
  }
  return {
    getItem: (key) => ls.get(key),
    setItem: (key, value) => ls.set(key, value),
    removeItem: (key) => ls.remove(key),
  };
}

const storage = getStorage();

// Clean up the legacy vuex-persistedstate payload that is no longer read.
function cleanupLegacy() {
  try {
    storage.removeItem("vuex");
  } catch (err) {
    /* best-effort */
  }
}

function readPayload() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return null;

    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || data.__version !== VERSION || typeof data.state !== "object") {
      return null;
    }
    return data.state;
  } catch (err) {
    // Corrupt/unreadable payload → fall back to module defaults.
    return null;
  }
}

function writePayload(state) {
  const snapshot = {};
  for (const moduleName of WHITELIST) {
    if (state[moduleName] == null) continue;
    // Deep clone so the stored snapshot is not a live reference to the store.
    snapshot[moduleName] = JSON.parse(JSON.stringify(state[moduleName]));
  }

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ __version: VERSION, state: snapshot })
    );
  } catch (err) {
    // Quota / serialisation errors are best-effort; persistence must not break
    // the app.
  }
}

const persistState = (store) => {
  cleanupLegacy();

  const saved = readPayload();
  if (saved) {
    const nextState = { ...store.state };
    for (const moduleName of WHITELIST) {
      if (saved[moduleName] && typeof saved[moduleName] === "object") {
        // Overlay onto the module defaults so missing/corrupt fields fall back
        // to their initial value instead of turning undefined.
        nextState[moduleName] = {
          ...nextState[moduleName],
          ...saved[moduleName],
        };
      }
    }
    store.replaceState(nextState);
  }

  store.subscribe((_mutation, state) => {
    writePayload(state);
  });
};

export default persistState;
