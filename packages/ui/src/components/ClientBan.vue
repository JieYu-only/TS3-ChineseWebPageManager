<template>
  <ban-form title="封禁用户" @addban="banClient" :ban="form"></ban-form>
</template>

<script>
import notify from "@/notify";
import clientService from "@/services/clientService";
import banService from "@/services/banService";
export default {
  components: {
    BanForm: () => import("@/components/BanForm"),
  },
  data() {
    return {
      clientDbInfo: {},
      clientDbId: this.$route.params.cldbid,
      form: {
        ip: "",
        name: "",
        uid: "",
        reason: "",
        time: 86400, // default is 1 day
      },
    };
  },
  methods: {
    getClientDbInfo() {
      return clientService.dbInfo(this.clientDbId);
    },
    async banClient(data) {
      try {
        await banService.createFromClient({
          ip: data.ip,
          name: data.name,
          uid: data.uid,
          reason: data.reason,
          time: data.time,
        });
      } catch (err) {
        notify.error(err.message);
      }

      this.$router.go(-1);
    },
  },
  async created() {
    try {
      this.clientDbInfo = await this.getClientDbInfo();

      this.form.ip = this.clientDbInfo.clientLastip;
      this.form.uid = this.clientDbInfo.clientUniqueIdentifier;
    } catch (err) {
      notify.error(err.message);
    }
  },
};
</script>
