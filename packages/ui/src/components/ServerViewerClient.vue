<template>
  <v-menu :offset="true" max-width="300px">
    <template #activator="{ props }">
      <span v-bind="props" class="tree-node-label">
        <client-avatar
          :clientDbId="client.clientDatabaseId"
          class="tree-client-avatar"
        ></client-avatar>
        {{ client.clientNickname }}
        <v-icon v-if="statusIcon" size="16">{{ statusIcon }}</v-icon>
      </span>
    </template>
    <v-list>
      <v-list-item title="提醒用户" append-icon="mdi-alert-octagram" @click="pokeClientDialog = true"></v-list-item>
      <v-list-item title="发起私聊" append-icon="mdi-send" @click="openPrivateChat(client.clid)"></v-list-item>
      <v-list-item title="编辑用户" append-icon="mdi-pencil" :to="{ name: 'client-edit', params: { clid: client.clid } }"></v-list-item>
      <v-list-item title="移出当前频道" append-icon="mdi-forward" @click="openKickDialog(4)"></v-list-item>
      <v-list-item title="踢出服务器" append-icon="mdi-forward" @click="openKickDialog(5)"></v-list-item>
      <v-list-item
        title="封禁用户"
        append-icon="mdi-block-helper"
        :to="{ name: 'client-ban', params: { cldbid: client.clientDatabaseId } }"
      ></v-list-item>
    </v-list>
  </v-menu>

  <v-dialog v-model="kickClientDialog" max-width="500px">
    <v-card>
      <v-card-title>从{{ destination }}移出用户</v-card-title>
      <v-card-text>
        <v-text-field label="操作原因" v-model="reason"></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="kickClientDialog = false" color="primary"
          >取消</v-btn
        >
        <v-btn variant="text" @click="kick" color="primary">确定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="pokeClientDialog" max-width="500px">
    <v-card>
      <v-card-title>提醒用户</v-card-title>
      <v-card-text>
        <v-text-field
          label="提醒消息"
          v-model="pokeMessage"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="pokeClientDialog = false" color="primary"
          >取消</v-btn
        >
        <v-btn variant="text" @click="poke" color="primary">发送</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import clientService from "@/services/clientService";
export default {
  components: {
    ClientAvatar: defineAsyncComponent(() => import("@/components/ClientAvatar")),
  },
  props: {
    client: Object,
  },
  data() {
    return {
      kickClientDialog: false,
      pokeClientDialog: false,
      pokeMessage: "",
      reason: "",
      destination: "",
      reasonid: null,
    };
  },
  computed: {
    statusIcon() {
      if (this.client.clientAway) {
        return "mdi-account-clock-outline";
      } else if (this.client.clientOutputMuted) {
        return "mdi-volume-off";
      } else if (this.client.clientInputMuted) {
        return "mdi-microphone-off";
      }
    },
  },
  methods: {
    async poke() {
      try {
        await clientService.poke({
          message: this.pokeMessage,
          clientId: this.client.clid,
        });
      } catch (err) {
        notify.error(err.message);
      }
      this.pokeMessage = "";
      this.pokeClientDialog = false;
    },
    openKickDialog(reasonid) {
      // reasonid :
      // 4 = kick form current channel into default channel
      // 5 = kick from server
      this.reasonid = reasonid;

      switch (this.reasonid) {
        case 4:
          this.destination = "频道";
          break;
        case 5:
          this.destination = "服务器";
      }

      this.kickClientDialog = true;
    },
    async kick() {
      try {
        await clientService.kick({
          reasonId: this.reasonid,
          reasonMessage: this.reason,
          clientId: this.client.clid,
        });
      } catch (err) {
        notify.error(err.message);
      }

      this.kickClientDialog = false;
    },
    openPrivateChat(clid) {
      this.$router.push({ name: "chat", query: { client: clid } });
    },
  },
};
</script>

<style scoped>
.tree-node-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1.4;
}
.tree-client-avatar {
  display: inline-flex;
}
</style>
