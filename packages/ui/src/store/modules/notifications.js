const state = {
  // FIFO queue of pending notifications so consecutive ones are not lost.
  queue: [],
};

const mutations = {
  enqueueNotification(state, notification) {
    state.queue.push(notification);
  },
  shiftNotification(state) {
    state.queue.shift();
  },
};

export default {
  state,
  mutations,
};
