<template>
  <v-container fluid class="console-page">
    <div class="page-breadcrumb"><v-icon small>mdi-home</v-icon><span>控制台</span><v-icon x-small>mdi-chevron-right</v-icon><strong>黑名单</strong></div>
    <div class="page-title-row"><div><h1>黑名单</h1><p>按 IP、名称或 UID 管理服务器封禁记录</p></div><v-btn color="primary" elevation="0" @click="addBan"><v-icon left small>mdi-plus</v-icon>添加封禁</v-btn></div>
    <v-layout>
      <v-flex xs12>
        <v-card class="content-card" elevation="0">
          <v-card-title>
            <v-layout wrap justify-space-between>
              <v-flex sm6 xs12>
                <v-btn
                  color="error"
                  :disabled="!Boolean(selectedTableItems.length)"
                  @click="openDialog(selectedTableItems)"
                >
                  <v-icon left>mdi-delete</v-icon>
                  删除所选
                </v-btn>
              </v-flex>
              <v-flex md4 sm6 xs12>
                <v-text-field
                  append-icon="mdi-magnify"
                  label="搜索黑名单"
                  v-model="filter"
                ></v-text-field>
              </v-flex>
            </v-layout>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :no-data-text="
                $store.state.query.loading ? '正在加载……' : '暂无封禁记录'
              "
              :headers="headers"
              :items="preparedBanlist"
              v-model="selectedTableItems"
              item-key="banid"
              show-select
              :footer-props="{ 'items-per-page-options': rowsPerPage }"
              :search="filter"
            >
              <template #item.actions="{ item }">
                <v-menu>
                  <template #activator="{ on, attrs }">
                    <v-btn icon v-bind="attrs" v-on="on">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item
                      :to="{ name: 'ban-edit', params: { banid: item.banid } }"
                    >
                      <v-list-item-title>编辑封禁</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openDialog([item])">
                      <v-list-item-title>删除封禁</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
              <template #item.nameIpUid="{ item }">
                <span v-if="item.ip">ip = {{ item.ip }}, </span>
                <span v-if="item.name">name = {{ item.name }}, </span>
                <span v-if="item.uid">uid = {{ item.uid }}, </span>
              </template>
              <template #item.duration="{ item }">
                {{
                  item.duration === 0
                    ? "永久"
                    : calcExpiryDate(item.created, item.duration)
                }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-btn color="primary" class="mobile-create" dark @click="addBan">
        <v-icon left>mdi-plus</v-icon>添加封禁
      </v-btn>
      <v-dialog v-model="dialog" max-width="500px">
        <v-card>
          <v-card-title>删除封禁</v-card-title>
          <v-card-text>
            确定要删除所选封禁记录吗？此操作无法撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="dialog = false">取消</v-btn>
            <v-btn text color="error" @click="deleteBans">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      headers: [
        {
          text: "",
          algin: "start",
          value: "actions",
        },
        {
          text: "IP / 名称 / UID",
          value: "nameIpUid",
        },
        {
          text: "原因",
          value: "reason",
        },
        {
          text: "过期时间",
          value: "duration",
        },
      ],
      banlist: [],
      selectedTableItems: [],
      dialog: false,
      rowsPerPage: [25, 50, 75, -1],
      filter: "",
      banRemoveList: [],
    };
  },
  computed: {
    // To enable the search for the column "Name/IP/UID"
    preparedBanlist() {
      return this.banlist.map((ban) => {
        return {
          ...ban,
          nameIpUid: `${ban.name} ${ban.uid} ${ban.ip}`,
        };
      });
    },
  },
  methods: {
    openDialog(bans) {
      this.banRemoveList = bans;

      this.dialog = true;
    },
    getBanList() {
      return this.$TeamSpeak.execute("banlist");
    },
    calcExpiryDate(created, duration) {
      return new Date(created * 1000 + duration * 1000).toLocaleString();
    },
    addBan() {
      this.$router.push({
        path: "/ban/add",
      });
    },
    async deleteBans() {
      try {
        for (let ban of this.banRemoveList) {
          await this.$TeamSpeak.execute("bandel", {
            banid: ban.banid,
          });
        }
      } catch (err) {
        this.$toast.error(err.message);
      }

      // v-model is not updating correctly when the content of the table changes.
      // Removed content is still in the selectedTableItems array.
      // This is a workaround for this vuetify bug.
      this.selectedTableItems = [];

      this.dialog = false;

      this.init();
    },
    async init() {
      try {
        this.banlist = await this.getBanList();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
  },
  async created() {
    this.init();
  },
};
</script>

<style scoped>
.console-page{max-width:1440px;padding:22px 30px 50px}.page-breadcrumb{display:flex;align-items:center;gap:7px;margin-bottom:18px;color:#9099a8;font-size:12px}.page-breadcrumb strong{color:#4b5668;font-weight:500}.page-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.page-title-row h1{margin:0;color:#19253b;font-size:23px}.page-title-row p{margin:4px 0 0;color:#929cab;font-size:12px}.content-card{overflow:hidden}.mobile-create{display:none}@media(max-width:600px){.console-page{padding:16px}.page-title-row>.v-btn{display:none}.mobile-create{display:flex;margin:18px auto}}
</style>
