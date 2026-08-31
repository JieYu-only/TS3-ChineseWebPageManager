<template>
  <channel-form title="创建频道" @save="save"></channel-form>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import channelService from "@/services/channelService";
export default {
  components: {
    ChannelForm: defineAsyncComponent(() => import("@/components/ChannelForm")),
  },
  methods: {
    createChannel(props) {
      return channelService.create(props);
    },
    async save(channelProps) {
      try {
        await this.createChannel({
          ...channelProps,
          cpid: +this.$route.query.pid,
        });

        this.$router.go(-1);
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
};
</script>
