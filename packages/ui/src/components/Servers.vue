<template>
  <v-container
    fluid
    class="console-page"
    :class="{ 'console-page--dark': $store.state.settings.darkMode }"
  >
    <div class="page-breadcrumb"><v-icon size="small">mdi-home</v-icon><span>控制台</span><v-icon size="x-small">mdi-chevron-right</v-icon><strong>服务器列表</strong></div>
    <div class="page-title-row">
      <div><div class="title-with-count"><h1>服务器列表</h1><v-chip size="small" color="indigo lighten-5" text-color="indigo">{{ servers.length }} 台</v-chip></div><p>管理 TeamSpeak 虚拟服务器及运行状态</p></div>
      <v-btn color="primary" elevation="0" :to="{ name: 'server-create' }"><v-icon start size="small">mdi-plus</v-icon>创建服务器</v-btn>
    </div>
    <v-row>
      <v-col cols="12">
        <v-card class="content-card" elevation="0">
          <v-card-text>
            <v-data-table
              :no-data-text="
                $store.state.query.loading ? '...loading' : '暂无数据'
              "
              :headers="headers"
              :items="servers"
              :item-class="serverRowClass"
              item-value="virtualserverId"
              :items-per-page-options="rowsPerPage"
            >
              <!-- show-select
          single-select v-model="selectedServer" -->
              <template #item.actions="{ item }">
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn icon v-bind="props">
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
                    :model-value="!isOffline(item.virtualserverStatus)"
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
                  size="small" variant="outlined"
                  color="primary"
                  elevation="0"
                  :disabled="isOffline(item.virtualserverStatus)"
                  @click="manageServer(item)"
                >
                  <v-icon start size="small">mdi-cog-outline</v-icon>管理
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="stopDialog" max-width="500px">
      <v-card>
        <v-card-title>停止服务器</v-card-title>
        <v-card-text>
          确定要停止这个虚拟服务器吗？
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="stopDialog = false" color="primary">取消</v-btn>
          <v-btn variant="text" @click="stopServer" color="primary">停止</v-btn>
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
          <v-btn variant="text" @click="deleteDialog = false" color="primary"
            >取消</v-btn
          >
          <v-btn variant="text" @click="deleteServer" color="error">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn
      color="primary"
      class="mobile-create"
      :to="{ name: 'server-create' }"
    >
      <v-icon start>mdi-plus</v-icon>创建服务器
    </v-btn>
  </v-container>
</template>

<script>
import notify from "@/notify";
import serverService from "@/services/serverService";
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
            await serverService.select(onlineServer.virtualserverId);
        }

        // Is primary needed to get the used server id
        vm.queryUser = await vm.getQueryUserData();

        vm.startUptimeCounters();
      } catch (err) {
        notify.error(err.message);
      }
    });
  },
  data() {
    return {
      // Explicit alignment + widths so the header, data cells and controls stay
      // stable across servers/rows instead of re-shrinking to the widest cell.
      // `min-width` keeps controls (radio/switch/buttons) from squeezing; the
      // numeric/time columns get a fixed width so text never wraps.
      headers: [
        {
          title: "操作",
          align: "start",
          key: "actions",
          sortable: false,
          width: 88,
        },
        {
          title: "选择",
          align: "center",
          key: "selectedSid",
          sortable: false,
          width: 88,
        },
        {
          title: "名称",
          align: "start",
          key: "virtualserverName",
          sortable: false,
          width: 200,
        },
        {
          title: "端口",
          align: "start",
          key: "virtualserverPort",
          sortable: false,
          width: 96,
        },
        {
          title: "在线/最大人数",
          align: "start",
          key: "virtualserverClientsonlineMaxclients",
          sortable: false,
          width: 128,
        },
        {
          title: "运行时间（天:时:分:秒）",
          align: "start",
          key: "virtualserverUptime",
          sortable: false,
          width: 190,
        },
        {
          title: "管理",
          align: "start",
          key: "manage",
          sortable: false,
          width: 112,
        },
        {
          title: "运行状态",
          align: "start",
          key: "virtualserverStatus",
          sortable: false,
          minWidth: 160,
        },
      ],
      servers: [],
      stopDialog: false,
      deleteDialog: false,
      counterIds: [],
      rowsPerPage: [
        { value: 25, title: "25" },
        { value: 50, title: "50" },
        { value: 75, title: "75" },
        { value: -1, title: "All" },
      ],
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
          await serverService.select(sid);
          this.queryUser = await this.getQueryUserData();
        } catch (err) {
          notify.error(err.message);
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
        await serverService.select(server.virtualserverId);
        this.queryUser = await this.getQueryUserData();
        this.$router.push({ name: "serverviewer" });
      } catch (err) {
        notify.error(err.message);
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
        notify.error(err.message);
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
        await serverService.remove(this.selectedServer.virtualserverId);

        this.deleteDialog = false;

        this.servers = await this.getServerList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    getQueryUserData() {
      return serverService.whoAmI();
    },
    async startServer(sid) {
      try {
        await serverService.start(sid);
        await serverService.select(sid);

        this.queryUser = await this.getQueryUserData();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async stopServer() {
      try {
        await serverService.stop(this.selectedServer.virtualserverId);

        this.stopDialog = false;

        this.servers = await this.getServerList();

        if (this.joinedServerId === this.selectedServer.virtualserverId)
          this.$store.dispatch("removeServerId");
      } catch (err) {
        notify.error(err.message);
      }
    },
    getServerList() {
      return serverService.list();
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
/* Vuetify 3 adds default vertical margins to radio-groups and switches; drop
   them so the row stays compact and the status text never gets squeezed or
   shifted relative to the switch. */
::v-deep .v-data-table td .v-radio-group,
::v-deep .v-data-table td .v-radio,
::v-deep .v-data-table td .v-radio-group .v-input__control,
::v-deep .v-data-table td .v-input--switch { margin: 0; padding: 0; }
::v-deep .v-data-table td { vertical-align: middle; }
/* On narrow screens, keep the table at a readable minimum width so the columns
   (with their controls) are not squeezed/truncated. The wrapper stays at the
   card width and scrolls horizontally; only the inner <table> keeps the min
   width so the columns never collapse. */
::v-deep .v-table { width: 100%; }
::v-deep .v-table__wrapper { overflow-x: auto; }
::v-deep .v-table__wrapper > table { min-width: 940px; }
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
