import { defineStore } from "pinia";

export const useQueryStore = defineStore("query", {
  state: () => ({
    serverId: null,
    loading: false,
    connected: false,
    queryUser: {},
  }),
  getters: {},
  actions: {
    isLoading(status) {
      this.loading = status;
    },
    saveUserInfo(userData) {
      this.queryUser = userData;
    },
    isConnected(status) {
      this.connected = status;
    },
    setServerId(id) {
      this.serverId = id;
    },
    /**
     * Clear all authentication / server state. Used on logout and when a session
     * is detected as invalid.
     */
    clearConnection() {
      this.isConnected(false);
      this.setServerId(null);
      this.saveUserInfo({});
    },
    /**
     * Persist a successful connection from a server-side session.
     */
    saveConnection({ serverId, queryUser } = {}) {
      this.isConnected(true);
      if (serverId) this.setServerId(serverId);
      if (queryUser) this.saveUserInfo(queryUser);
    },
    setServerIdAction(sid) {
      this.setServerId(sid);
    },
    /**
     * Drop the currently joined virtual server id (used when the active server
     * is stopped or the connection is reset).
     */
    removeServerId() {
      this.setServerId(null);
    },
  },
});

// Vuex-compatible mutation map used by the store façade's commit(). These are the
// synchronous state changes that components and services address by name.
export const queryMutations = {
  isLoading: (state, status) => {
    state.loading = status;
  },
  saveUserInfo: (state, userData) => {
    state.queryUser = userData;
  },
  isConnected: (state, status) => {
    state.connected = status;
  },
  setServerId: (state, id) => {
    state.serverId = id;
  },
};

export default useQueryStore;
