<template lang="html">
  <channel-form
    title="创建频道分隔符"
    @save="save"
    spacer
    :channel="channel"
  ></channel-form>
</template>

<script>
import notify from "@/notify";
import channelService from "@/services/channelService";
export default {
  components: {
    ChannelForm: () => import("@/components/ChannelForm"),
  },
  data() {
    return {
      // set channel type to permanent by default
      channel: { channelFlagPermanent: 1 },
    };
  },
  methods: {
    createChannel(props) {
      return channelService.create(props);
    },
    async save(channelProps) {
      try {
        await this.createChannel({
          channelFlagPermanent: 1,
          ...channelProps,
        });

        this.$router.go(-1);
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
};
</script>
