<template>
  <div>
    <v-menu offset-y max-width="300px">
      <template #activator="{ on }">
        <v-list-item v-on="on">
          <v-list-item-avatar>
            <client-avatar
              :clientDbId="client.clientDatabaseId"
            ></client-avatar>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>
              {{ client.clientNickname }} <v-icon>{{ statusIcon }}</v-icon>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <v-list>
        <v-list-item @click="pokeClientDialog = true">
          <v-list-item-action>
            <v-icon>mdi-alert-octagram</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 提醒用户 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="openPrivateChat(client.clid)">
          <v-list-item-action>
            <v-icon>mdi-send</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 发起私聊 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :to="{ name: 'client-edit', params: { clid: client.clid } }"
        >
          <v-list-item-action>
            <v-icon>mdi-pencil</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 编辑用户 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="openKickDialog(4)">
          <v-list-item-action>
            <v-icon>mdi-forward</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 移出当前频道 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="openKickDialog(5)">
          <v-list-item-action>
            <v-icon>mdi-forward</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 踢出服务器 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :to="{
            name: 'client-ban',
            params: { cldbid: client.clientDatabaseId },
          }"
        >
          <v-list-item-action>
            <v-icon>mdi-block-helper</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 封禁用户 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
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
          <v-btn text @click="kickClientDialog = false" color="primary"
            >取消</v-btn
          >
          <v-btn text @click="kick" color="primary">确定</v-btn>
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
          <v-btn text @click="pokeClientDialog = false" color="primary"
            >取消</v-btn
          >
          <v-btn text @click="poke" color="primary">发送</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
export default {
  components: {
    ClientAvatar: () => import("@/components/ClientAvatar"),
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
        await this.$TeamSpeak.execute("clientpoke", {
          msg: this.pokeMessage,
          clid: this.client.clid,
        });
      } catch (err) {
        this.$toast.error(err.message);
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
        await this.$TeamSpeak.execute("clientkick", {
          reasonid: this.reasonid,
          reasonmsg: this.reason,
          clid: this.client.clid,
        });
      } catch (err) {
        this.$toast.error(err.message);
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
* {
  text-transform: none !important;
}
</style>
