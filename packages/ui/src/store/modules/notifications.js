import { defineStore } from "pinia";

export const useNotificationsStore = defineStore("notifications", {
  state: () => ({
    // FIFO queue of pending notifications so consecutive ones are not lost.
    queue: [],
  }),
  getters: {},
  actions: {
    enqueueNotification(notification) {
      this.queue.push(notification);
    },
    shiftNotification() {
      this.queue.shift();
    },
  },
});

export const notificationsMutations = {
  enqueueNotification: (state, notification) => {
    state.queue.push(notification);
  },
  shiftNotification: (state) => {
    state.queue.shift();
  },
};

export default useNotificationsStore;
