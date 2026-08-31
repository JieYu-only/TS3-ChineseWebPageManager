import TeamSpeak from "@/api/TeamSpeak";

// event -> Map<handler, handler>. The registry lets us de-duplicate listeners
// (repeated mount / reconnect) and release every subscription on logout.
const registry = new Map();

// Domain-oriented subscription helpers: components ask for a business event and
// never name the raw TeamSpeak event. Map domain name -> raw event.
const DOMAIN_EVENTS = {
  onTextMessage: "textmessage",
  onClientConnected: "clientconnect",
  onClientDisconnected: "clientdisconnect",
  onClientMoved: "clientmoved",
  onServerEdited: "serveredit",
  onTokenUsed: "tokenused",
  onChannelEdited: "channeledit",
  onChannelCreated: "channelcreate",
  onChannelMoved: "channelmoved",
  onChannelDeleted: "channeldelete",
};

function subscribeRaw(event, handler) {
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
 * Subscribe to a TeamSpeak event. Subscribing the same handler to the same event
 * more than once is a no-op, so re-mounting or reconnecting cannot leak or
 * double-register a listener.
 * @param {string} event raw TeamSpeak event name
 * @param {Function} handler listener invoked with the event detail
 * @returns {{ event: string, handler: Function, unsubscribe: () => void }}
 */
function subscribe(event, handler) {
  return subscribeRaw(event, handler);
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

const eventService = {
  subscribe,
  unsubscribe,
  clear,
};

// Expose domain-oriented helpers, e.g. eventService.onClientConnected(handler).
// Each returns the same disposable handle as subscribe().
for (const [method, rawEvent] of Object.entries(DOMAIN_EVENTS)) {
  eventService[method] = (handler) => subscribeRaw(rawEvent, handler);
}

export default eventService;
