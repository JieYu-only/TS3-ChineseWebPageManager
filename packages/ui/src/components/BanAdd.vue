<template>
  <ban-form title="添加封禁" @addban="addBan" :ban="ban"></ban-form>
</template>

<script>
import notify from "@/notify";
import banService from "@/services/banService";
export default {
  components: {
    BanForm: () => import("@/components/BanForm"),
  },
  data() {
    return {
      ban: {
        ip: null,
        name: null,
        uid: null,
        reason: "",
        time: 86400, // default is 1 day
      },
    };
  },
  methods: {
    async addBan(data) {
      try {
        await banService.create({
          ip: data.ip,
          name: data.name,
          uid: data.uid,
          reason: data.reason,
          time: data.time,
        });

        this.$router.push({
          name: "bans",
        });
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
};
</script>
