<template>
  <div>
    <v-menu offset-y max-width="300px">
      <template #activator="{ on }">
        <v-list-item v-if="isSpacer(channel.channelName)" dense v-on="on">
          <v-list-item-content>
            <v-list-item-title>
              <spacer :channelName="channel.channelName"></spacer>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-else dense v-on="on">
          <v-list-item-avatar>
            <v-icon large>mdi-hexagon-slice-4</v-icon>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>
              {{ channel.channelName }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <v-list>
        <v-list-item @click="enterChannel">
          <v-list-item-action>
            <v-icon>mdi-arrow-right</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 移动到此频道 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :to="{
            name: 'channel-edit',
            params: { cid: channel.cid },
            query: { pid: channel.pid },
          }"
        >
          <v-list-item-action>
            <v-icon>mdi-pencil</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 编辑频道 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :to="{ name: 'permissions-channel', params: { cid: channel.cid } }"
        >
          <v-list-item-action>
            <v-icon>mdi-shield-check</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 频道权限 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item :to="{ name: 'channel-add', query: { pid: channel.cid } }">
          <v-list-item-action>
            <v-icon>mdi-plus</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 创建子频道 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="confirmChannelDeletion(channel)">
          <v-list-item-action>
            <v-icon>mdi-delete</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title> 删除频道 </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-dialog v-model="deleteChannelDialog" max-width="500px">
      <v-card>
        <v-card-title>删除频道</v-card-title>
        <v-card-text>
          确定要删除这个频道吗？
          <v-checkbox
            v-model="forceDeletion"
            label="即使频道中仍有用户也强制删除"
          ></v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteChannel" color="primary">确定</v-btn>
          <v-btn text @click="deleteChannelDialog = false" color="primary"
            >取消</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
// Do not dynamically import this component !!!
// Otherwise it will not be shown !!!
import Spacer from "@/components/Spacer";

export default {
  props: {
    channel: Object,
    queryUser: Object,
  },
  components: {
    Spacer,
  },
  data() {
    return {
      spacer: /^\[(.*)(spacer)(.*)\](.*)/,
      deleteChannelDialog: false,
      selectedChannel: {},
      forceDeletion: false,
    };
  },
  methods: {
    isSpacer(channelName) {
      return this.spacer.test(channelName) && this.channel.pid === "0";
    },
    confirmChannelDeletion(channel) {
      this.selectedChannel = {
        ...channel,
      };

      this.deleteChannelDialog = true;
    },
    async deleteChannel() {
      let { cid } = this.selectedChannel;
      let force = +this.forceDeletion;

      try {
        await this.$TeamSpeak.execute("channeldelete", {
          cid: cid,
          force: force,
        });
      } catch (err) {
        this.$toast.error(err.message);
      }

      this.deleteChannelDialog = false;
    },
    moveClient() {
      return this.$TeamSpeak.execute("clientmove", {
        clid: this.queryUser.clientId,
        cid: this.channel.cid,
      });
    },
    async enterChannel() {
      try {
        await this.moveClient();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
  },
};
</script>

<style scoped>
* {
  text-transform: none !important;
}
</style>
