import { defineStore } from "pinia";
import notify from "@/notify";
import { useQueryStore } from "./query";

export const useChatStore = defineStore("chat", {
  state: () => ({
    messages: [],
  }),
  getters: {
    unreadMessages(state) {
      const queryStore = useQueryStore();
      return state.messages.filter((message) => {
        return (
          message.meta.unread && message.serverId === queryStore.serverId
        );
      }).length;
    },
  },
  actions: {
    saveMessage(message) {
      // Only the last 50 messages are stored
      if (this.messages.length > 50) this.messages.shift();

      this.messages.push(message);
    },
    markMessageAsRead({ target, targetmode }) {
      for (let i = 0; i < this.messages.length; i++) {
        if (
          this.messages[i].target === target &&
          this.messages[i].targetmode === targetmode
        ) {
          this.messages[i].meta.unread = false;
        }
      }
    },
    removeAllMessages() {
      this.messages = [];
    },
    async handleReceivedMessages(notification) {
      try {
        const queryStore = useQueryStore();
        if (notification.invoker.clid !== queryStore.queryUser.clientId) {
          this.saveTextMessage({
            targetmode: notification.targetmode,
            sender: {
              clid: notification.invoker.clid,
              clientNickname: notification.invoker.clientNickname,
            },
            text: notification.msg,
            meta: {
              unread: true,
            },
          });
        }
      } catch (err) {
        notify.error(err.message);
      }
    },
    async saveTextMessage({ targetmode, sender, text, target, meta }) {
      try {
        const queryStore = useQueryStore();
        if (!target) {
          switch (targetmode) {
            case 1:
              target = sender.clid;
              break;
            case 2:
              target = queryStore.queryUser.clientChannelId;
              break;
            case 3:
              target = queryStore.serverId;
          }
        }

        meta.timestamp = new Date();

        this.saveMessage({
          sender,
          target,
          targetmode,
          text,
          meta,
          serverId: queryStore.serverId,
        });
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
});

export const chatMutations = {
  saveMessage: (state, message) => {
    if (state.messages.length > 50) state.messages.shift();
    state.messages.push(message);
  },
  markMessageAsRead: (state, { target, targetmode }) => {
    for (let i = 0; i < state.messages.length; i++) {
      if (
        state.messages[i].target === target &&
        state.messages[i].targetmode === targetmode
      ) {
        state.messages[i].meta.unread = false;
      }
    }
  },
  removeAllMessages: (state) => {
    state.messages = [];
  },
};

export default useChatStore;
