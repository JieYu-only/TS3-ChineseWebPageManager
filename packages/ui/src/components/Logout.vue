<template></template>

<script>
import sessionService from "@/services/sessionService";

export default {
  async created() {
    try {
      await sessionService.logout();
    } catch (err) {
      // Even if the server request fails, clear local state below.
    }

    this.$store.dispatch("clearConnection");

    this.$router.replace({ name: "login" });
  },
};
</script>
