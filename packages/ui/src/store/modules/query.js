const state = {
  serverId: null,
  loading: false,
  connected: false,
  loggedOut: true,
  queryUser: {},
  sessionExpiresAt: null,
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
  isLoggedOut(state, status) {
    state.loggedOut = status;
  },
  setSessionExpiresAt(state, timestamp) {
    state.sessionExpiresAt = timestamp;
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
    commit("isLoggedOut", true);
    commit("setSessionExpiresAt", null);
  },
  /**
   * Persist a successful connection from a server-side session.
   */
  saveConnection({ commit }, { serverId, queryUser, sessionExpiresAt } = {}) {
    commit("isConnected", true);
    commit("isLoggedOut", false);
    if (serverId) commit("setServerId", serverId);
    if (queryUser) commit("saveUserInfo", queryUser);
    if (sessionExpiresAt) commit("setSessionExpiresAt", sessionExpiresAt);
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
