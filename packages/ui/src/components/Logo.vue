<template lang="html">
  <v-list-item class="logo-item">
    <template #prepend>
      <img class="logo-mark" :src="logo" alt="TS3 Manager" />
    </template>
    <v-list-item-title>TS3 Manager</v-list-item-title>
    <v-list-item-subtitle>{{ version }}</v-list-item-subtitle>
  </v-list-item>
</template>

<script>
import packageInfo from "../../../../package.json";
import logo from "@/assets/ts3_manager_logo.svg";

export default {
  data() {
    return {
      logo,
      version: packageInfo.version,
    };
  },
};
</script>

<style scoped>
.logo-item {
  min-height: 64px;
}

.logo-mark {
  width: 42px;
  height: 42px;
  margin-right: 12px;
  object-fit: contain;
}
</style>
