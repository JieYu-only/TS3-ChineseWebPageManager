import { defineStore } from "pinia";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    rememberLogin: true,
    notifications: true,
    darkMode:
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  }),
  getters: {},
  actions: {
    setRememberLogin(status) {
      this.rememberLogin = status;
    },
    setNotifications(status) {
      this.notifications = status;
    },
    setDarkMode(status) {
      this.darkMode = status;
    },
  },
});

export const settingsMutations = {
  setRememberLogin: (state, status) => {
    state.rememberLogin = status;
  },
  setNotifications: (state, status) => {
    state.notifications = status;
  },
  setDarkMode: (state, status) => {
    state.darkMode = status;
  },
};

export default useSettingsStore;
