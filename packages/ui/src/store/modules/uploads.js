import { defineStore } from "pinia";

export const useUploadsStore = defineStore("uploads", {
  state: () => ({
    queue: [],
  }),
  getters: {
    uploading: (state) => {
      return !!state.queue.find((file) => file.uploading);
    },
  },
  actions: {
    addFileToQueue(file) {
      this.queue.push(file);
    },
    removeFileFromQueue(clientftfid) {
      let index = this.queue.findIndex(
        (file) => file.clientftfid === clientftfid
      );
      this.queue.splice(index, 1);
    },
    setFileUploadProgress({ clientftfid, percentage }) {
      let index = this.queue.findIndex(
        (file) => file.clientftfid === clientftfid
      );
      this.queue[index].progress = percentage;
    },
    resetUploadState() {
      for (let i = 0; i < this.queue.length; i++) {
        this.queue[i].uploading = false;
      }
    },
  },
});

export const uploadsMutations = {
  addFileToQueue: (state, file) => {
    state.queue.push(file);
  },
  removeFileFromQueue: (state, clientftfid) => {
    let index = state.queue.findIndex(
      (file) => file.clientftfid === clientftfid
    );
    state.queue.splice(index, 1);
  },
  setFileUploadProgress: (state, { clientftfid, percentage }) => {
    let index = state.queue.findIndex(
      (file) => file.clientftfid === clientftfid
    );
    state.queue[index].progress = percentage;
  },
  resetUploadState: (state) => {
    for (let i = 0; i < state.queue.length; i++) {
      state.queue[i].uploading = false;
    }
  },
};

export default useUploadsStore;
