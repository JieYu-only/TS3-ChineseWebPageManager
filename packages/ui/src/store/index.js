import Vuex from "vuex";
import Vue from "vue";

import settings from "./modules/settings";
import query from "./modules/query";
import chat from "./modules/chat";
import avatars from "./modules/avatars";
import uploads from "./modules/uploads";
import notifications from "./modules/notifications";

import persistState from "./persist";

// Vuex store. Only user-retained runtime state is persisted (see store/persist.js),
// which is restored at startup and written on mutation.
Vue.use(Vuex);

const store = new Vuex.Store({
  actions: {
    clearStorage({ dispatch, commit }) {
      dispatch("clearConnection");
      commit("removeAllMessages");
    },
  },
  modules: {
    settings,
    query,
    chat,
    avatars,
    uploads,
    notifications,
  },
  plugins: [persistState],
});

export default store;
