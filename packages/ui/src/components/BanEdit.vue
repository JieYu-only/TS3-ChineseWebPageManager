<template>
  <ban-form title="编辑封禁" @addban="save" :ban="ban"></ban-form>
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
      banid: this.$route.params.banid,
      banlist: [],
      newBanList: [],
      initialBan: {},
      ban: {},
    };
  },
  methods: {
    getBanList() {
      return banService.list();
    },
    getBan(banlist) {
      return banlist.find((ban) => ban.banid == this.banid);
    },
    async save(data) {
      try {
        await banService.update({
          banId: this.banid,
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
    async init() {
      try {
        this.banlist = await this.getBanList();
        this.ban = this.getBan(this.banlist);

        this.$set(this.ban, "time", this.ban.duration);
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
