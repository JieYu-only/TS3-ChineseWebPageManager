<template>
  <channel-form title="创建频道" @save="save"></channel-form>
</template>

<script>
import notify from "@/notify";
export default {
  components: {
    ChannelForm: () => import("@/components/ChannelForm"),
  },
  methods: {
    createChannel(props) {
      return this.$TeamSpeak.execute("channelcreate", props);
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
