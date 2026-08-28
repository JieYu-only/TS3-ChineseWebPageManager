<template></template>

<script>
import { logout as sessionLogout } from "@/api/session";

export default {
  async created() {
    try {
      await sessionLogout();
    } catch (err) {
      // Even if the server request fails, clear local state below.
    }

    this.$store.dispatch("clearConnection");

    try {
      this.$socket.disconnect();
    } catch (err) {
      // Ignore socket teardown errors.
    }

    this.$router.replace({ name: "login" });
  },
};
</script>
