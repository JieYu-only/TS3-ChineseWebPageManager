<template>
  <v-tooltip location="bottom">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :aria-label="label"
        @click="toggleDarkMode"
      >
        <v-icon>{{ icon }}</v-icon>
      </v-btn>
    </template>
    <span>{{ label }}</span>
  </v-tooltip>
</template>

<script>
import { useTheme } from "vuetify";

export default {
  setup() {
    const theme = useTheme();
    return { theme };
  },
  computed: {
    icon() {
      return this.$store.state.settings.darkMode
        ? "mdi-white-balance-sunny"
        : "mdi-weather-night";
    },
    label() {
      return this.$store.state.settings.darkMode
        ? "切换到浅色主题"
        : "切换到深色主题";
    },
  },
  methods: {
    toggleDarkMode() {
      const dark = this.theme.global.name.value === "dark";
      this.theme.global.name.value = dark ? "light" : "dark";
      // Keep the Vuetify 3 theme and the persisted setting in sync.
      this.$store.commit("setDarkMode", !dark);
    },
  },
};
</script>
