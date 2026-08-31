import { createPinia, setActivePinia } from "pinia";
import { reactive, computed, watch } from "vue";

import { useSettingsStore, settingsMutations } from "./modules/settings";
import { useQueryStore, queryMutations } from "./modules/query";
import { useChatStore, chatMutations } from "./modules/chat";
import { useAvatarsStore, avatarsMutations } from "./modules/avatars";
import { useUploadsStore, uploadsMutations } from "./modules/uploads";
import { useNotificationsStore, notificationsMutations } from "./modules/notifications";
import persistState from "./persist";

/**
 * Pinia store instance. The stores are the single source of truth for runtime
 * state. We also expose a thin Vuex-compatible façade below (the default
 * `store` export) so the migration is incremental: the framework-agnostic
 * services (`socket.js`, `notify.js`, `api/TeamSpeak.js`), the router guard and
 * the existing components keep using `store.commit / dispatch / state /
 * getters / watch / subscribe / replaceState` without a wholesale rewrite.
 */
export const pinia = createPinia();
setActivePinia(pinia);

const settingsStore = useSettingsStore();
const queryStore = useQueryStore();
const chatStore = useChatStore();
const avatarsStore = useAvatarsStore();
const uploadsStore = useUploadsStore();
const notificationsStore = useNotificationsStore();

const storesByModule = {
  settings: settingsStore,
  query: queryStore,
  chat: chatStore,
  avatars: avatarsStore,
  uploads: uploadsStore,
  notifications: notificationsStore,
};

// mutation name -> { state, fn }. The synchronous mutations are called by the
// façade's commit() with the store's reactive `$state`.
const mutationRegistry = {};
for (const [store, mutations] of [
  [settingsStore, settingsMutations],
  [queryStore, queryMutations],
  [chatStore, chatMutations],
  [avatarsStore, avatarsMutations],
  [uploadsStore, uploadsMutations],
  [notificationsStore, notificationsMutations],
]) {
  for (const [name, fn] of Object.entries(mutations)) {
    mutationRegistry[name] = { state: store.$state, fn };
  }
}

// Reactive combined state, shaped like the legacy Vuex `state` (module names at
// the top level). Each module value is the corresponding Pinia store's reactive
// `$state`, so `state.query.connected`, `state.settings.darkMode` etc. stay
// reactive for components and watchers.
const state = reactive({
  settings: settingsStore.$state,
  query: queryStore.$state,
  chat: chatStore.$state,
  avatars: avatarsStore.$state,
  uploads: uploadsStore.$state,
  notifications: notificationsStore.$state,
});

// Reactive getters (auto-unwrapped by `reactive`).
const getters = reactive({
  unreadMessages: computed(() => chatStore.unreadMessages),
  uploading: computed(() => uploadsStore.uploading),
});

const subscribers = [];

function commit(type, payload) {
  const entry = mutationRegistry[type];
  if (entry) entry.fn(entry.state, payload);

  // Notify persistence subscribers with the legacy (mutation, state) signature.
  for (const subscriber of subscribers) {
    subscriber({ type, payload }, state);
  }
}

function dispatch(type, payload) {
  switch (type) {
    case "clearStorage":
      queryStore.clearConnection();
      chatStore.removeAllMessages();
      return undefined;
    case "setServerIdAction":
      return queryStore.setServerIdAction(payload);
    case "saveConnection":
      return queryStore.saveConnection(payload);
    case "clearConnection":
      return queryStore.clearConnection(payload);
    case "removeServerId":
      return queryStore.removeServerId(payload);
    case "getClientAvatars":
      return avatarsStore.getClientAvatars(payload);
    case "saveTextMessage":
      return chatStore.saveTextMessage(payload);
    case "handleReceivedMessages":
      return chatStore.handleReceivedMessages(payload);
    default:
      return undefined;
  }
}

function subscribe(callback) {
  subscribers.push(callback);
}

function replaceState(nextState) {
  // Only user-retained modules (see store/persist.js) are ever rehydrated.
  for (const moduleName of ["settings", "chat"]) {
    if (nextState[moduleName] != null && storesByModule[moduleName]) {
      Object.assign(storesByModule[moduleName].$state, nextState[moduleName]);
    }
  }
}

function storeWatch(getter, callback) {
  // Vuex `store.watch` invoked the getter with (state, getters); keep that
  // contract by passing the reactive state so legacy getters keep working.
  return watch(() => getter(state), callback, { flush: "sync" });
}

const store = {
  state,
  getters,
  commit,
  dispatch,
  subscribe,
  replaceState,
  watch: storeWatch,
};

// Wire up persistence (restore on first load, write on every committed mutation).
persistState(store);

export default store;
