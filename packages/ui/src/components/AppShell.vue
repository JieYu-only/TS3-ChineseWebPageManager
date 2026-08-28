<template>
  <div>
    <v-app-bar app flat class="console-header" color="white">
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
        v-if="connected"
      ></v-app-bar-nav-icon>
      <div v-if="connected" class="page-caption">
        <span class="caption-kicker">TEAMSpeak Console</span>
        <strong>{{ currentTitle }}</strong>
      </div>
      <v-spacer></v-spacer>
      <dark-mode-switch></dark-mode-switch>
      <file-upload-icon v-if="connected"></file-upload-icon>
      <bell-icon v-if="connected"></bell-icon>
    </v-app-bar>

    <v-navigation-drawer app v-model="drawer" v-if="connected" width="272" class="console-drawer">
      <v-list dense class="pt-3 px-3" subheader nav>
        <logo></logo>
        <v-divider></v-divider>

        <!-- Avoid v-if with v-for https://v3.vuejs.org/style-guide/#avoid-v-if-with-v-for-essential -->
        <template v-for="(entry, i) in menuEntries">
          <v-list-item
            :key="i"
            v-if="!entry.submenu"
            @click="pushRoute(entry)"
            :class="{ 'v-list-item--active': $route.name === entry.route.name }"
          >
            <v-list-item-icon>
              <v-badge
                color="error"
                :value="entry.title === 'Chat' && $store.getters.unreadMessages"
              >
                <template #badge>
                  <span>{{ $store.getters.unreadMessages }}</span>
                </template>
                <v-icon>{{ entry.icon }}</v-icon>
              </v-badge>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                {{ entry.title }}
                <v-icon v-if="entry.experimental">mdi-test-tube</v-icon>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <v-list-group v-else :key="i" no-action :prepend-icon="entry.icon">
            <template #activator>
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-title>
                    {{ entry.title }}
                  </v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </template>
            <v-list-item
              v-for="(subEntry, j) in entry.submenu"
              :key="j"
              @click="pushRoute(subEntry)"
              :class="{
                'v-list-item--active': $route.name === subEntry.route.name,
              }"
            >
              <v-list-item-icon>
                <v-icon>{{ subEntry.icon }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  {{ subEntry.title }}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list-group>
        </template>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script>
export default {
  components: {
    DarkModeSwitch: () => import("@/components/DarkModeSwitch"),
    BellIcon: () => import("@/components/BellIcon"),
    FileUploadIcon: () => import("@/components/FileUploadIcon"),
    Logo: () => import("@/components/Logo"),
    ServerSelection: () => import("@/components/ServerSelection"),
  },
  data() {
    return {
      mini: true,
      drawer: null,
      menuEntries: [
        {
          title: "服务器列表",
          icon: "dns",
          route: { name: "servers" },
        },
        {
          title: "实时监控",
          icon: "remove_red_eye",
          route: { name: "serverviewer" },
        },
        {
          title: "消息中心",
          icon: "mail_outline",
          route: { name: "chat" },
        },
        {
          title: "文件管理",
          icon: "mdi-folder",
          route: { name: "files" },
        },
        {
          title: "服务器日志",
          icon: "mdi-file-document-outline",
          route: { name: "logs" },
        },
        {
          title: "备份与恢复",
          icon: "settings_backup_restore",
          route: { name: "snapshot" },
        },
        {
          title: "查询终端",
          icon: "mdi-console",
          route: { name: "console" },
        },
        {
          title: "权限密钥",
          icon: "mdi-key",
          route: { name: "tokens" },
        },
        {
          title: "API 密钥",
          icon: "mdi-shield-key",
          route: { name: "apikeys" },
        },
        {
          title: "封禁列表",
          icon: "not_interested",
          route: { name: "bans" },
        },
        {
          title: "投诉记录",
          icon: "warning",
          route: { name: "complaints" },
        },

        {
          title: "用户管理",
          icon: "person",
          route: { name: "clients" },
        },
        {
          title: "服务器组",
          icon: "group",
          route: { name: "servergroups" },
        },
        {
          title: "频道组",
          icon: "mdi-hexagon-slice-4",
          route: { name: "channelgroups" },
        },
        {
          title: "权限管理",
          icon: "mdi-format-section",
          submenu: [
            {
              title: "Server Group",
              icon: "group",
              route: { name: "permissions-servergroup" },
            },
            {
              title: "Client Permissions",
              icon: "person",
              route: { name: "permissions-client" },
            },
            {
              title: "Channel Permissions",
              icon: "mdi-hexagon-slice-4",
              route: { name: "permissions-channel" },
            },
            {
              title: "Channel Groups",
              icon: "mdi-hexagon-slice-4",
              route: { name: "permissions-channelgroup" },
            },
            {
              title: "Channel Client Permissions",
              icon: "mdi-hexagon-slice-4",
              route: { name: "permissions-channelclient" },
            },
          ],
        },
        {
          title: "退出登录",
          icon: "exit_to_app",
          route: { name: "logout" },
        },
      ],
    };
  },
  computed: {
    connected() {
      return this.$store.state.query.connected;
    },
    currentTitle() {
      const direct = this.menuEntries.find((entry) => entry.route && entry.route.name === this.$route.name);
      if (direct) return direct.title;
      for (const entry of this.menuEntries) {
        const child = entry.submenu && entry.submenu.find((item) => item.route.name === this.$route.name);
        if (child) return child.title;
      }
      return "管理控制台";
    },
  },
  methods: {
    pushRoute(entry) {
      if (entry.route.name !== this.$route.name) {
        this.$router.push(entry.route);
      }
    },
  },
};
</script>

<style scoped>
.console-header { border-bottom: 1px solid #edf0f4 !important; }
.page-caption { display: flex; flex-direction: column; margin-left: 10px; line-height: 1.25; }
.page-caption strong { color: #1d2940; font-size: 16px; }
.caption-kicker { color: #9aa3b1; font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase; }
.console-drawer { border-right: 0 !important; box-shadow: 4px 0 18px rgba(25, 40, 67, .05); }
.console-drawer .v-list-item { min-height: 42px; margin-bottom: 4px; border-radius: 7px; color: #596579; }
.console-drawer .v-list-item--active { color: #6268df !important; background: #f0f1ff !important; }
.console-drawer .v-list-item__icon { margin-right: 18px; }
</style>
