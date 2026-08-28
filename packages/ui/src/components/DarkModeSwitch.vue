<template>
  <v-tooltip bottom>
    <template #activator="{ on, attrs }">
      <v-btn
        icon
        v-bind="attrs"
        v-on="on"
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
export default {
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
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark;

      this.$store.commit("setDarkMode", this.$vuetify.theme.dark);
    },
  },
};
</script>
