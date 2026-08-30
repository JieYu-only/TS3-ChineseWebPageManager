const state = {
  serverId: null,
  loading: false,
  connected: false,
  queryUser: {},
};

const mutations = {
  isLoading(state, status) {
    state.loading = status;
  },
  saveUserInfo(state, userData) {
    state.queryUser = userData;
  },
  isConnected(state, status) {
    state.connected = status;
  },
  setServerId(state, id) {
    state.serverId = id;
  },
};

const actions = {
  /**
   * Clear all authentication / server state. Used on logout and when a session
   * is detected as invalid.
   */
  clearConnection({ commit }) {
    commit("isConnected", false);
    commit("setServerId", null);
    commit("saveUserInfo", {});
  },
  /**
   * Persist a successful connection from a server-side session.
   */
  saveConnection({ commit }, { serverId, queryUser } = {}) {
    commit("isConnected", true);
    if (serverId) commit("setServerId", serverId);
    if (queryUser) commit("saveUserInfo", queryUser);
  },
  setServerIdAction({ commit }, sid) {
    commit("setServerId", sid);
  },
};

export default {
  state,
  mutations,
  actions,
};
