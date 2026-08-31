<template>
  <v-menu :offset="true" max-width="300px">
    <template #activator="{ props }">
      <span v-bind="props" class="tree-node-label">
        <spacer
          v-if="isSpacer(channel.channelName)"
          :channelName="channel.channelName"
        ></spacer>
        <template v-else>
          <v-icon size="18" class="tree-node-icon">mdi-hexagon-slice-4</v-icon>
          {{ channel.channelName }}
        </template>
      </span>
    </template>
    <v-list>
      <v-list-item title="移动到此频道" append-icon="mdi-arrow-right" @click="enterChannel"></v-list-item>
      <v-list-item
        title="编辑频道"
        append-icon="mdi-pencil"
        :to="{
          name: 'channel-edit',
          params: { cid: channel.cid },
          query: { pid: channel.pid },
        }"
      ></v-list-item>
      <v-list-item
        title="频道权限"
        append-icon="mdi-shield-check"
        :to="{ name: 'permissions-channel', params: { cid: channel.cid } }"
      ></v-list-item>
      <v-list-item
        title="创建子频道"
        append-icon="mdi-plus"
        :to="{ name: 'channel-add', query: { pid: channel.cid } }"
      ></v-list-item>
      <v-list-item title="删除频道" append-icon="mdi-delete" @click="confirmChannelDeletion(channel)"></v-list-item>
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
        <v-btn variant="text" @click="deleteChannel" color="primary">确定</v-btn>
        <v-btn variant="text" @click="deleteChannelDialog = false" color="primary"
          >取消</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import notify from "@/notify";
import channelService from "@/services/channelService";
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
        await channelService.remove({ channelId: cid, force });
      } catch (err) {
        notify.error(err.message);
      }

      this.deleteChannelDialog = false;
    },
    moveClient() {
      return channelService.moveClient({
        clientId: this.queryUser.clientId,
        channelId: this.channel.cid,
      });
    },
    async enterChannel() {
      try {
        await this.moveClient();
      } catch (err) {
        notify.error(err.message);
      }
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
.tree-node-icon {
  color: inherit;
}
</style>
