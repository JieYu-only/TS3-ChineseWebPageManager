<template>
  <div class="management-tabs">
    <router-link v-for="tab in tabs" :key="tab.route" :to="{ name: tab.route }" :class="{ active: active === tab.route }">
      <v-icon small>{{ tab.icon }}</v-icon><span>{{ tab.title }}</span>
    </router-link>
  </div>
</template>

<script>
export default {
  props: { active: { type: String, required: true } },
  data() { return { tabs: [
    { title: "服务器", icon: "mdi-view-dashboard-outline", route: "servers" },
    { title: "密钥", icon: "mdi-key-outline", route: "tokens" },
    { title: "黑名单", icon: "mdi-block-helper", route: "bans" },
    { title: "快照", icon: "mdi-camera-outline", route: "snapshot" },
  ] }; },
};
</script>

<style scoped>
.management-tabs { display: flex; align-items: center; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid #e7eaf0; overflow-x: auto; }
.management-tabs a { display: flex; align-items: center; gap: 7px; min-width: max-content; padding: 13px 18px; color: #727d8f; font-size: 13px; text-decoration: none; border-bottom: 2px solid transparent; }
.management-tabs a.active { color: #6268df; border-bottom-color: #6268df; }.management-tabs a.active .v-icon { color: #6268df; }
</style>
