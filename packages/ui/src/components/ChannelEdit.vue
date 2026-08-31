<template>
  <div>
    <channel-form
      :applyButton="true"
      title="编辑频道"
      :channel="channel"
      @save="save"
    ></channel-form>

    <v-dialog v-model="temporaryChannelWarning" max-width="500px">
      <v-card>
        <v-card-title>临时频道提示</v-card-title>
        <v-card-text>
          如果频道中没有用户并将其改为临时频道，该频道会立即被删除。是否继续？
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" color="primary" @click="saveAndLeave">继续</v-btn>
          <v-btn variant="text" color="primary" @click="temporaryChannelWarning = false"
            >取消</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import channelService from "@/services/channelService";
export default {
  components: {
    ChannelForm: defineAsyncComponent(() => import("@/components/ChannelForm")),
  },
  data() {
    return {
      channelId: this.$route.params.cid,
      channel: {},
      temporaryChannelWarning: false,
      pendingChanges: null,
    };
  },
  methods: {
    getChannelInfo() {
      return channelService.info(this.channelId);
    },
    channelIsTemporary(channelProps) {
      let newChannelProps = { ...this.channel, ...channelProps };

      if (
        newChannelProps.channelFlagPermanent === 0 &&
        newChannelProps.channelFlagSemiPermanent === 0
      ) {
        return true;
      } else {
        return false;
      }
    },
    editChannel(channelProps) {
      if (!Object.keys(channelProps).length) return false;

      return channelService.edit({
        channelId: this.channelId,
        ...channelProps,
      });
    },
    async save(channelProps, e) {
      try {
        if (this.channelIsTemporary(channelProps)) {
          this.temporaryChannelWarning = true;

          this.pendingChanges = channelProps;
        } else {
          switch (e.target.textContent.toLowerCase()) {
            case "apply":
              await this.editChannel(channelProps);

              this.init();

              break;
            case "ok":
              await this.editChannel(channelProps);

              this.$router.go(-1);
          }
        }
      } catch (err) {
        notify.error(err.message);
      }
    },
    async saveAndLeave() {
      try {
        await this.editChannel(this.pendingChanges);

        this.$router.go(-1);
      } catch (err) {
        notify.error(err.message);
      }
    },
    async init() {
      try {
        this.channel = await this.getChannelInfo();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  created() {
    this.init();
  },
};
</script>
