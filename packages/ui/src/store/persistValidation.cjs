const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

function sanitizeSettings(value) {
  if (!isPlainObject(value)) return null;

  const settings = {};
  for (const field of ["rememberLogin", "notifications", "darkMode"]) {
    if (typeof value[field] === "boolean") settings[field] = value[field];
  }
  return settings;
}

function sanitizeChat(value) {
  if (!isPlainObject(value) || !Array.isArray(value.messages)) return null;
  return { messages: value.messages };
}

function parsePersistedState(raw, version) {
  try {
    if (raw == null) return null;

    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      !isPlainObject(data) ||
      data.__version !== version ||
      !isPlainObject(data.state)
    ) {
      return null;
    }

    const state = {};
    const settings = sanitizeSettings(data.state.settings);
    const chat = sanitizeChat(data.state.chat);
    if (settings) state.settings = settings;
    if (chat) state.chat = chat;
    return state;
  } catch (err) {
    return null;
  }
}

module.exports = { parsePersistedState };
