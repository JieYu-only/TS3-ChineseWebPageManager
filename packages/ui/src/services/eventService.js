import TeamSpeak from "@/api/TeamSpeak";

// event -> Map<handler, handler>. The registry lets us de-duplicate listeners
// (repeated mount / reconnect) and release every subscription on logout.
const registry = new Map();

/**
 * Subscribe to a TeamSpeak event. Subscribing the same handler to the same event
 * more than once is a no-op, so re-mounting or reconnecting cannot leak or
 * double-register a listener.
 * @param {string} event TeamSpeak event name (e.g. "client-connected")
 * @param {Function} handler listener invoked with the event detail
 * @returns {{ event: string, handler: Function, unsubscribe: () => void }}
 */
function subscribe(event, handler) {
  let handlers = registry.get(event);
  if (!handlers) {
    handlers = new Map();
    registry.set(event, handlers);
  }

  if (!handlers.has(handler)) {
    handlers.set(handler, handler);
    TeamSpeak.on(event, handler);
  }

  return {
    event,
    handler,
    unsubscribe() {
      const map = registry.get(event);
      if (map && map.delete(handler)) {
        TeamSpeak.off(event, handler);
        if (map.size === 0) registry.delete(event);
      }
    },
  };
}

/**
 * Release a subscription previously returned by subscribe().
 * @param {object} subscription
 */
function unsubscribe(subscription) {
  if (subscription && typeof subscription.unsubscribe === "function") {
    subscription.unsubscribe();
  }
}

/**
 * Release every subscription. Call this on logout so listeners from a previous
 * session never fire against the next one.
 */
function clear() {
  for (const [event, handlers] of registry) {
    for (const handler of handlers.values()) {
      TeamSpeak.off(event, handler);
    }
    handlers.clear();
  }
  registry.clear();
}

export default {
  subscribe,
  unsubscribe,
  clear,
};
