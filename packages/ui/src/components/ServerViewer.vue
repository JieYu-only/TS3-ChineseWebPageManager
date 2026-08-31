<template>
  <v-container fluid class="console-page">
    <page-header title="实时在线" description="实时查看频道树与服务器在线用户" :breadcrumbs="['控制台', '实时在线']" />
    <div class="viewer-tabs">
      <div class="viewer-tab active"><v-icon small>mdi-view-dashboard-outline</v-icon>服务器频道</div>
      <div class="viewer-stat"><span>服务器</span><strong>{{ serverInfo.virtualserverName || 'TeamSpeak 3' }}</strong></div>
      <div class="viewer-stat"><span>在线人数</span><strong>{{ clientList.length }}</strong></div>
    </div>
    <v-layout>
      <v-flex xs12>
        <v-card class="viewer-card" elevation="0">
          <v-card-title class="viewer-title"><div><v-icon color="primary" class="mr-2">mdi-account-tree-outline</v-icon>实时在线</div><v-chip small color="success" text-color="white">运行中</v-chip></v-card-title>
          <v-card-text>
            <v-treeview :items="channelTree" :open="itemIDs" dense>
              <template #label="{ item }">
                <channel
                  v-if="item.channelName"
                  :channel="item"
                  :queryUser="queryUser"
                ></channel>
                <client v-else :client="item"></client>
              </template>
            </v-treeview>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>

    <v-speed-dial right bottom fixed v-model="speedDial">
      <template #activator>
        <v-tooltip left>
          <template #activator="{ on, attrs }">
            <v-btn
              fab
              color="primary"
              dark
              v-bind="attrs"
              v-on="on"
              :aria-label="speedDial ? '收起创建菜单' : '添加频道或分隔符'"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>{{ speedDial ? '收起创建菜单' : '添加频道或分隔符' }}</span>
        </v-tooltip>
      </template>
      <v-tooltip left>
        <template #activator="{ on, attrs }">
          <v-btn
            fab
            color="primary"
            dark
            small
            v-bind="attrs"
            v-on="on"
            :to="{ name: 'channel-add' }"
            aria-label="创建频道"
          >
            <v-icon>mdi-hexagon-slice-4</v-icon>
          </v-btn>
        </template>
        <span>创建频道</span>
      </v-tooltip>
      <v-tooltip left>
        <template #activator="{ on, attrs }">
          <v-btn
            fab
            color="primary"
            dark
            small
            v-bind="attrs"
            v-on="on"
            :to="{ name: 'spacer-add' }"
            aria-label="创建频道分隔符"
          >
            <v-icon>mdi-keyboard-space</v-icon>
          </v-btn>
        </template>
        <span>创建频道分隔符</span>
      </v-tooltip>
    </v-speed-dial>
  </v-container>
</template>
<script>
import notify from "@/notify";
import eventService from "@/services/eventService";
export default {
  components: {
    Channel: () => import("@/components/ServerViewerChannel"),
    Client: () => import("@/components/ServerViewerClient"),
  },
  data() {
    return {
      serverInfo: {},
      channelList: [],
      clientList: [],
      itemIDs: [],
      channelTree: [],
      currentChannel: {},
      textPrivates: [],
      speedDial: false,
    };
  },
  computed: {
    queryUser: {
      get() {
        return this.$store.state.query.queryUser;
      },
      set(value) {
        this.$store.commit("saveUserInfo", value);
      },
    },
  },
  methods: {
    // Props to http://oskarhane.com/create-a-nested-array-recursively-in-javascript/
    createNestedList(list, itemID = 0) {
      let out = [];

      for (let item of list) {
        if (item.parentItemId == itemID) {
          let children = this.createNestedList(list, item.itemId);

          if (children.length) {
            item.children = children;
          }

          out.push(item);
        }
      }

      return out;
    },
    addEventListeners() {
      this.eventSubscriptions = [
        eventService.onClientMoved(this.loadChannelTree),
        eventService.onClientConnected(this.loadChannelTree),
        eventService.onClientConnected(this.getSingleClientAvatar),
        eventService.onClientDisconnected(this.loadChannelTree),
        eventService.onChannelDeleted(this.loadChannelTree),
      ];
    },
    removeEventListeners() {
      (this.eventSubscriptions || []).forEach((subscription) =>
        eventService.unsubscribe(subscription)
      );
      this.eventSubscriptions = [];
    },
    openAllChannels() {
      this.channelList.forEach((channel) =>
        this.itemIDs.push(`${channel.cid}-channel`)
      );
    },
    getSingleClientAvatar(e) {
      this.$store.dispatch("getClientAvatars", [
        e.detail.client.clientDatabaseId,
      ]);
    },
    getAllClientAvatars() {
      this.$store.dispatch(
        "getClientAvatars",
        this.clientList.map((client) => client.clientDatabaseId)
      );
    },
    getServerInfo() {
      return this.$TeamSpeak
        .getServerInfo()
        .then((serverinfo) => serverinfo[0]);
    },
    getChannelList() {
      return this.$TeamSpeak.getChannelList();
    },
    getClientList() {
      return this.$TeamSpeak.getClientList();
    },
    whoAmI() {
      return this.$TeamSpeak.whoAmI();
    },
    mergedList(clientlist, channellist) {
      return [...clientlist, ...channellist].map((item) => {
        if (item.clientNickname) {
          return {
            id: `${item.clid}-client`,
            name: item.clientNickname,
            parentItemId: item.cid,
            itemId: null,
            ...item,
          };
        } else {
          return {
            id: `${item.cid}-channel`,
            name: item.channelName,
            itemId: item.cid,
            parentItemId: item.pid,
            ...item,
          };
        }
      });
    },
    getCurrentChannel(channelList, queryUser) {
      return channelList.find(
        (channel) => channel.cid === queryUser.clientChannelId
      );
    },
    async updateCurrentChannel() {
      try {
        this.queryUser = await this.whoAmI();

        this.currentChannel = this.getCurrentChannel(
          this.channelList,
          this.queryUser
        );
      } catch (err) {
        notify.error(err.message);
      }
    },
    async loadChannelTree() {
      try {
        this.channelList = await this.getChannelList();
        this.clientList = await this.getClientList();

        this.channelTree = this.createNestedList(
          this.mergedList(this.clientList, this.channelList)
        );

        this.openAllChannels();
      } catch (err) {
        notify.error(err.message);
      }

      this.updateCurrentChannel();
    },
  },
  async created() {
    try {
      this.serverInfo = await this.getServerInfo();
      this.serverInfo.unreadMessages = 0;
      this.channelList = await this.getChannelList();
      this.clientList = await this.getClientList();
      this.queryUser = await this.whoAmI();
      this.channelTree = this.createNestedList(
        this.mergedList(this.clientList, this.channelList)
      );
      this.currentChannel = this.getCurrentChannel(
        this.channelList,
        this.queryUser
      );

      this.openAllChannels();

      this.addEventListeners();

      this.getAllClientAvatars();
    } catch (err) {
      notify.error(err.message);
    }
  },
  beforeRouteLeave(from, to, next) {
    this.removeEventListeners();

    next();
  },
};
</script>

<style scoped>
.console-page { max-width: 1440px; padding: 22px 30px 50px; }
.viewer-tabs { display: flex; align-items: stretch; gap: 12px; margin-bottom: 18px; border-bottom: 1px solid #e8ebf0; }.viewer-tab { display: flex; align-items: center; gap: 7px; padding: 13px 18px; color: #687386; font-size: 13px; }.viewer-tab.active { color: #6268df; border-bottom: 2px solid #6268df; }.viewer-stat { display: flex; flex-direction: column; justify-content: center; padding: 0 18px; border-left: 1px solid #edf0f4; }.viewer-stat span { color: #9ca5b2; font-size: 10px; }.viewer-stat strong { color: #243047; font-size: 13px; }
.viewer-card { min-height: 420px; }.viewer-title { display: flex; justify-content: space-between; padding: 20px 22px; border-bottom: 1px solid #edf0f4; color: #1f2a3e; font-size: 17px; }
@media (max-width: 600px) { .console-page { padding: 16px; }.viewer-tabs { overflow-x: auto; }.viewer-stat { min-width: 115px; } }
</style>
