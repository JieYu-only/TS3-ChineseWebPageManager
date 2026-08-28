const state = {
  rememberLogin: true,
  notifications: true,
  darkMode:
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches,
};

const mutations = {
  setRememberLogin(state, status) {
    state.rememberLogin = status;
  },
  setNotifications(state, status) {
    state.notifications = status;
  },
  setDarkMode(state, status) {
    state.darkMode = status;
  },
};

export default {
  state,
  mutations,
};
