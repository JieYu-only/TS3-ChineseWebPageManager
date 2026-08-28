<template>
  <div class="management-tabs-wrap">
  <div class="management-tabs">
    <router-link v-for="tab in tabs" :key="tab.route" :to="{ name: tab.route }" :class="{ active: isActive(tab) }">
      <v-icon small>{{ tab.icon }}</v-icon><span>{{ tab.title }}</span>
    </router-link>
  </div>
  </div>
</template>

<script>
export default {
  props: { active: { type: String, required: true } },
  data() { return { tabs: [
    { title: "实时在线", icon: "mdi-eye-outline", route: "serverviewer", children: ["channel-edit", "channel-add", "spacer-add", "client-edit", "client-ban"] },
    { title: "消息中心", icon: "mdi-email-outline", route: "chat" },
    { title: "文件管理", icon: "mdi-folder-outline", route: "files", children: ["file-upload"] },
    { title: "服务器日志", icon: "mdi-file-document-outline", route: "logs" },
    { title: "查询终端", icon: "mdi-console", route: "console" },
    { title: "权限密钥", icon: "mdi-key-outline", route: "tokens", children: ["token-add"] },
    { title: "API 密钥", icon: "mdi-shield-key-outline", route: "apikeys", children: ["apikey-add"] },
    { title: "黑名单", icon: "mdi-block-helper", route: "bans", children: ["ban-add", "ban-edit"] },
    { title: "快照", icon: "mdi-camera-outline", route: "snapshot" },
    { title: "投诉记录", icon: "mdi-alert-outline", route: "complaints" },
    { title: "用户管理", icon: "mdi-account-outline", route: "clients" },
    { title: "服务器组", icon: "mdi-account-group-outline", route: "servergroups", children: ["servergroup-edit"] },
    { title: "频道组", icon: "mdi-hexagon-slice-4", route: "channelgroups", children: ["channelgroup-edit"] },
    { title: "权限管理", icon: "mdi-format-section", route: "permissions-servergroup", children: ["permissions-client", "permissions-channel", "permissions-channelgroup", "permissions-channelclient"] },
  ] }; },
  methods: {
    isActive(tab) {
      return this.active === tab.route || (tab.children || []).includes(this.active);
    },
  },
};
</script>

<style scoped>
.management-tabs-wrap { position: sticky; top: 64px; z-index: 4; padding: 9px 0; background: rgba(255,255,255,.94); border-bottom: 1px solid #e8ecf3; backdrop-filter: blur(12px); }
.management-tabs { display: flex; align-items: center; gap: 5px; max-width: 1440px; margin: 0 auto; padding: 0 30px; overflow-x: auto; scrollbar-width: thin; }
.management-tabs a { display: flex; align-items: center; gap: 7px; min-width: max-content; padding: 9px 13px; color: #707c8f; font-size: 12px; font-weight: 500; text-decoration: none; border: 1px solid transparent; border-radius: 9px; transition: all .18s ease; }
.management-tabs a:hover { color: #565dd2; background: #f5f6ff; }
.management-tabs a.active { color: #555cda; background: #eeefff; border-color: #dfe1ff; box-shadow: 0 3px 10px rgba(98,104,223,.1); }.management-tabs a.active .v-icon { color: #6268df; }
@media(max-width:600px){.management-tabs-wrap{top:56px}.management-tabs{padding:0 16px}.management-tabs a{padding:8px 11px}}
</style>
