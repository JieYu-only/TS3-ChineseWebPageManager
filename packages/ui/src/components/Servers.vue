<template>
  <v-container
    fluid
    class="console-page"
    :class="{ 'console-page--dark': $vuetify.theme.dark }"
  >
    <div class="page-breadcrumb"><v-icon small>mdi-home</v-icon><span>控制台</span><v-icon x-small>mdi-chevron-right</v-icon><strong>服务器列表</strong></div>
    <div class="page-title-row">
      <div><div class="title-with-count"><h1>服务器列表</h1><v-chip small color="indigo lighten-5" text-color="indigo">{{ servers.length }} 台</v-chip></div><p>管理 TeamSpeak 虚拟服务器及运行状态</p></div>
      <v-btn color="primary" elevation="0" :to="{ name: 'server-create' }"><v-icon left small>mdi-plus</v-icon>创建服务器</v-btn>
    </div>
    <v-layout>
      <v-flex xs12>
        <v-card class="content-card" elevation="0">
          <v-card-text>
            <v-data-table
              :no-data-text="
                $store.state.query.loading ? '...loading' : $vuetify.noDataText
              "
              :headers="headers"
              :items="servers"
              :item-class="serverRowClass"
              item-key="virtualserverId"
              :footer-props="{ 'items-per-page-options': rowsPerPage }"
            >
              <!-- show-select
          single-select v-model="selectedServer" -->
              <template #item.actions="{ item }">
                <v-menu>
                  <template #activator="{ on, attrs }">
                    <v-btn icon v-bind="attrs" v-on="on">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item
                      :to="{ name: 'server-edit' }"
                      :disabled="isOffline(item.virtualserverStatus)"
                    >
                      <v-list-item-title>编辑服务器</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openDeleteDialog(item)">
                      <v-list-item-title>删除服务器</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
              <template #item.selectedSid="{ item }">
                <v-radio-group v-model="joinedServerId">
                  <v-radio
                    :value="item.virtualserverId"
                    :disabled="
                      item.virtualserverStatus === 'offline' ||
                      $store.state.query.loading
                    "
                  >
                  </v-radio>
                </v-radio-group>
              </template>
              <template #item.virtualserverClientsonlineMaxclients="{ item }">
                {{ item.virtualserverClientsonline }}/{{
                  item.virtualserverMaxclients
                }}
              </template>
              <template #item.virtualserverUptime="{ item }">
                {{ calcUptime(item.virtualserverUptime) }}
              </template>
              <template #item.virtualserverStatus="{ item }">
                <!-- <v-switch v-model="onlineServerIds" :value="item.virtualserverId"></v-switch> -->
                <div class="status-cell">
                  <v-switch
                    :input-value="!isOffline(item.virtualserverStatus)"
                    readonly
                    hide-details
                    inset
                    @click="changeServerStatus(item)"
                  ></v-switch>
                  <span :class="['status-text', isOffline(item.virtualserverStatus) ? 'offline' : 'online']">
                    {{ isOffline(item.virtualserverStatus) ? '已停止' : '运行中' }}
                  </span>
                </div>
              </template>
              <template #item.manage="{ item }">
                <v-btn
                  small outlined
                  color="primary"
                  elevation="0"
                  :disabled="isOffline(item.virtualserverStatus)"
                  @click="manageServer(item)"
                >
                  <v-icon left small>mdi-cog-outline</v-icon>管理
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>

    <v-dialog v-model="stopDialog" max-width="500px">
      <v-card>
        <v-card-title>停止服务器</v-card-title>
        <v-card-text>
          确定要停止这个虚拟服务器吗？
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="stopDialog = false" color="primary">取消</v-btn>
          <v-btn text @click="stopServer" color="primary">停止</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>删除服务器</v-card-title>
        <v-card-text>
          确定要删除这个虚拟服务器吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false" color="primary"
            >取消</v-btn
          >
          <v-btn text @click="deleteServer" color="error">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn
      color="primary"
      class="mobile-create"
      :to="{ name: 'server-create' }"
    >
      <v-icon left>mdi-plus</v-icon>创建服务器
    </v-btn>
  </v-container>
</template>

<script>
export default {
  beforeRouteEnter(to, from, next) {
    next(async (vm) => {
      try {
        vm.servers = await vm.getServerList();

        // Pick the first virtual server after login
        if (from.name === "login") {
          let onlineServer = vm.servers.find(
            (server) => server.virtualserverStatus === "online"
          );

          if (onlineServer)
            await vm.$TeamSpeak.selectServer(onlineServer.virtualserverId);
        }

        // Is primary needed to get the used server id
        vm.queryUser = await vm.getQueryUserData();

        vm.startUptimeCounters();
      } catch (err) {
        vm.$toast.error(err.message);
      }
    });
  },
  data() {
    return {
      headers: [
        {
          text: "",
          align: "start",
          value: "actions",
          sortable: false,
        },
        {
          text: "选择",
          align: "start",
          value: "selectedSid",
          sortable: false,
        },
        {
          text: "名称",
          value: "virtualserverName",
          sortable: false,
        },
        {
          text: "端口",
          value: "virtualserverPort",
          sortable: false,
        },
        {
          text: "在线/最大人数",
          value: "virtualserverClientsonlineMaxclients",
          sortable: false,
        },
        {
          text: "运行时间（天:时:分:秒）",
          value: "virtualserverUptime",
          sortable: false,
        },
        {
          text: "管理",
          value: "manage",
          sortable: false,
        },
        {
          text: "运行状态",
          value: "virtualserverStatus",
          sortable: false,
        },
      ],
      servers: [],
      stopDialog: false,
      deleteDialog: false,
      counterIds: [],
      rowsPerPage: [25, 50, 75, -1],
      queryUser: {},
    };
  },
  computed: {
    joinedServerId: {
      get() {
        return this.queryUser.virtualserverId;
      },
      async set(sid) {
        try {
          await this.$TeamSpeak.selectServer(sid);
          this.queryUser = await this.getQueryUserData();
        } catch (err) {
          this.$toast.error(err.message);
        }
      },
    },
  },
  methods: {
    serverRowClass(item) {
      return item.virtualserverId === this.joinedServerId
        ? "selected-server-row"
        : "";
    },
    async manageServer(server) {
      try {
        await this.$TeamSpeak.selectServer(server.virtualserverId);
        this.queryUser = await this.getQueryUserData();
        this.$router.push({ name: "serverviewer" });
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    secondsToDHMS(seconds) {
      return {
        days: (seconds / 86400) >> 0,
        hours: ((seconds % 86400) / 3600) >> 0,
        minutes: ((seconds % 3600) / 60) >> 0,
        seconds: seconds % 60 >> 0,
      };
    },
    async changeServerStatus(server) {
      if (this.isOffline(server.virtualserverStatus)) {
        await this.startServer(server.virtualserverId);
      } else {
        this.openStopDialog(server);
      }

      try {
        this.servers = await this.getServerList();
      } catch (err) {
        this.$toast.error(err.message);
      }

      this.resetUptimeCounters();
    },
    openStopDialog(server) {
      this.selectedServer = server;

      this.stopDialog = true;
    },
    openDeleteDialog(server) {
      this.selectedServer = server;

      this.deleteDialog = true;
    },
    async deleteServer() {
      try {
        await this.$TeamSpeak.execute("serverdelete", {
          sid: this.selectedServer.virtualserverId,
        });

        this.deleteDialog = false;

        this.servers = await this.getServerList();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    getQueryUserData() {
      return this.$TeamSpeak.execute("whoami").then((list) => list[0]);
    },
    async startServer(sid) {
      try {
        await this.$TeamSpeak.execute("serverstart", { sid });
        await this.$TeamSpeak.selectServer(sid);

        this.queryUser = await this.getQueryUserData();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    async stopServer() {
      try {
        await this.$TeamSpeak.execute("serverstop", {
          sid: this.selectedServer.virtualserverId,
        });

        this.stopDialog = false;

        this.servers = await this.getServerList();

        if (this.joinedServerId === this.selectedServer.virtualserverId)
          this.$store.dispatch("removeServerId");
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    getServerList() {
      return this.$TeamSpeak.execute("serverlist");
    },
    isOffline(status) {
      return status === "offline" ? true : false;
    },
    calcUptime(seconds) {
      let time = this.secondsToDHMS(seconds);

      return `${time.days}:${time.hours < 10 ? "0" + time.hours : time.hours}:${
        time.minutes < 10 ? "0" + time.minutes : time.minutes
      }:${time.seconds < 10 ? "0" + time.seconds : time.seconds}`;
    },
    startUptimeCounters() {
      for (let i = 0; i < this.servers.length; i++) {
        this.servers[i].virtualserverUptime = parseInt(
          this.servers[i].virtualserverUptime
        );

        if (!this.isOffline(this.servers[i].virtualserverStatus)) {
          this.counterIds[i] = setInterval(() => {
            this.servers[i].virtualserverUptime += 1;
          }, 1000);
        }
      }
    },
    removeUptimeCounters() {
      for (let id of this.counterIds) {
        clearTimeout(id);
      }
    },
    resetUptimeCounters() {
      this.removeUptimeCounters();
      this.startUptimeCounters();
    },
  },
  beforeRouteLeave(from, to, next) {
    this.removeUptimeCounters();

    next();
  },
};
</script>

<style scoped>
.console-page { max-width: 1440px; padding: 30px 30px 48px; }
.page-breadcrumb { display: flex; align-items: center; gap: 7px; margin-bottom: 28px; color: #9099a8; font-size: 12px; }
.page-breadcrumb strong { color: #4b5668; font-weight: 500; }
.page-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.page-title-row h1 { margin: 0; color: #19253b; font-size: 26px; letter-spacing: -.4px; }.page-title-row p { margin: 6px 0 0; color: #8a96a8; font-size: 13px; }
.title-with-count { display: flex; align-items: center; gap: 12px; }
.content-card { overflow: hidden; border-radius: 14px !important; }.mobile-create { display: none; }
.status-cell { display: flex; align-items: center; gap: 9px; min-width: 105px; }
.status-cell .v-input { margin: 0; padding: 0; }
.status-text { font-size: 12px; font-weight: 600; white-space: nowrap; }
.status-text.online { color: #23a26d; }.status-text.offline { color: #9aa4b2; }
::v-deep .selected-server-row { background: #f7f8ff !important; }
::v-deep .selected-server-row td:first-child { box-shadow: inset 3px 0 #6268df; }
.console-page--dark .page-breadcrumb { color: #aeb3c3; }
.console-page--dark .page-breadcrumb strong { color: #d7dae3; }
.console-page--dark .page-title-row h1 { color: #f3f4f8; }
.console-page--dark .page-title-row p { color: #aeb3c3; }
.console-page--dark ::v-deep .selected-server-row { background: #414457 !important; }
.console-page--dark ::v-deep .selected-server-row td { color: #f3f4f8 !important; }
.console-page--dark ::v-deep .selected-server-row td:first-child { box-shadow: inset 3px 0 #bd93f9; }
@media (max-width: 600px) { .console-page { padding: 16px; }.page-title-row p { display: none; }.page-title-row > .v-btn { display: none; }.mobile-create { display: flex; margin: 18px auto; }.page-breadcrumb { margin-bottom: 18px; } }
</style>
