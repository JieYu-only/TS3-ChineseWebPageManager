<template>
  <div>
    <v-app-bar app flat class="console-header">
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
        v-if="connected"
      ></v-app-bar-nav-icon>
      <div v-if="connected" class="page-caption">
        <span class="caption-kicker">TeamSpeak 管理控制台</span>
        <strong>{{ currentTitle }}</strong>
      </div>
      <v-spacer></v-spacer>
      <dark-mode-switch></dark-mode-switch>
      <file-upload-icon v-if="connected"></file-upload-icon>
      <bell-icon v-if="connected"></bell-icon>
    </v-app-bar>

    <v-navigation-drawer app v-model="drawer" v-if="connected" width="240" class="console-drawer">
      <v-list dense class="pt-3 px-3" subheader nav>
        <logo></logo>
        <v-divider></v-divider>
        <div class="drawer-label">主导航</div>

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
          icon: "mdi-server",
          route: { name: "servers" },
        },
        {
          title: "退出登录",
          icon: "mdi-logout",
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
      const hiddenTitles = {
        servers: "服务器列表",
        tokens: "权限密钥",
        apikeys: "API 密钥",
        bans: "封禁列表",
        snapshot: "备份与恢复",
        serverviewer: "实时在线",
        chat: "消息中心",
        files: "文件管理",
        logs: "服务器日志",
        console: "查询终端",
        complaints: "投诉记录",
        clients: "用户管理",
        servergroups: "服务器组",
        channelgroups: "频道组",
        "permissions-servergroup": "服务器组权限",
        "permissions-client": "用户权限",
        "permissions-channel": "频道权限",
        "permissions-channelgroup": "频道组权限",
        "permissions-channelclient": "频道用户权限",
      };
      return hiddenTitles[this.$route.name] || "管理控制台";
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
.console-header { border-bottom: 1px solid rgba(224, 229, 238, .8) !important; box-shadow: 0 3px 16px rgba(29, 41, 64, .035) !important; }
.page-caption { display: flex; flex-direction: column; margin-left: 10px; line-height: 1.25; }
.page-caption strong { color: #19263d; font-size: 16px; font-weight: 700; }
.caption-kicker { color: #9aa3b1; font-size: 9px; letter-spacing: 1.3px; text-transform: uppercase; }
.console-drawer { border-right: 1px solid #e9edf4 !important; background: linear-gradient(180deg,#fff 0%,#fbfcff 100%) !important; box-shadow: 5px 0 22px rgba(25, 40, 67, .045); }
.drawer-label { padding: 22px 12px 8px; color: #a0a9b7; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; }
.console-drawer .v-list-item { min-height: 46px; margin-bottom: 6px; padding: 0 14px; border-radius: 10px; color: #5c687b; transition: all .18s ease; }
.console-drawer .v-list-item:hover { color: #424bba; background: #f5f6ff; transform: translateX(2px); }
.console-drawer .v-list-item--active { color: #555cda !important; background: linear-gradient(90deg,#eeefff,#f6f6ff) !important; box-shadow: inset 3px 0 #6268df; }
.console-drawer .v-list-item__icon { margin-right: 14px; }
.console-drawer .v-icon { font-size: 21px; }
.console-header.theme--dark { border-bottom-color: #3b3e50 !important; background: #343746 !important; }
.console-header.theme--dark .page-caption strong { color: #f3f4f8; }
.console-header.theme--dark .caption-kicker { color: #aeb3c3; }
.console-drawer.theme--dark { border-right-color: #3b3e50 !important; background: linear-gradient(180deg,#343746 0%,#2e303e 100%) !important; }
.console-drawer.theme--dark .drawer-label { color: #969caf; }
.console-drawer.theme--dark .v-list-item { color: #c7cad5; }
.console-drawer.theme--dark .v-list-item:hover { color: #fff; background: #414457; }
.console-drawer.theme--dark .v-list-item--active { color: #e1d2ff !important; background: linear-gradient(90deg,#49405d,#3d3f52) !important; box-shadow: inset 3px 0 #bd93f9; }
</style>
