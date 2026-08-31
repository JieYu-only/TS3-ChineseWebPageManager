<template>
  <v-snackbar
    v-model="visible"
    :color="color"
    :timeout="timeout"
    location="top"
  >
    {{ message }}
    <template #action="{ props }">
      <v-btn v-bind="props" @click="dismiss">关闭</v-btn>
    </template>
  </v-snackbar>
</template>

<script>
export default {
  data() {
    return {
      visible: false,
      current: null,
    };
  },
  computed: {
    message() {
      return this.current ? this.current.message : "";
    },
    color() {
      const type = this.current && this.current.type;
      return (
        {
          success: "success",
          info: "info",
          warning: "warning",
          error: "error",
        }[type] || "info"
      );
    },
    timeout() {
      return this.current && this.current.duration != null
        ? this.current.duration
        : 4000;
    },
    notificationCount() {
      return this.$store.state.notifications.queue.length;
    },
  },
  watch: {
    visible(value) {
      // When the current snackbar closes, show the next queued notification.
      if (!value) this.$nextTick(() => this.flush());
    },
    notificationCount() {
      this.flush();
    },
  },
  methods: {
    flush() {
      if (this.visible) return;

      const next = this.$store.state.notifications.queue[0];
      if (!next) return;

      this.$store.commit("shiftNotification");
      this.current = next;
      this.visible = true;
    },
    dismiss() {
      this.visible = false;
    },
  },
  created() {
    this.flush();
  },
};
</script>
