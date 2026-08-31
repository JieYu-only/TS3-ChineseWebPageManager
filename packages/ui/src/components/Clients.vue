<template>
  <v-container fluid class="console-page">
    <page-header title="用户管理" description="查询服务器历史用户及连接信息" :breadcrumbs="['控制台', '用户管理']" />
    <v-row>
      <v-col cols="12">
        <v-card class="content-card" elevation="0">
          <v-card-title>
            <v-row justify="space-between">
              <v-col sm="6" cols="12">
                <v-btn
                  color="error"
                  :disabled="!Boolean(selectedTableItems.length)"
                  @click="openRemoveDialog(selectedTableItems)"
                >
                  <v-icon start>mdi-delete</v-icon>
                  删除所选
                </v-btn>
              </v-col>
              <v-col md="4" sm="6" cols="12">
                <v-text-field
                  append-icon="mdi-magnify"
                  label="搜索用户"
                  v-model="search"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :no-data-text="
                $store.state.query.loading ? '正在加载……' : '暂无用户记录'
              "
              :headers="headers"
              :items="clientdblist"
              :search="search"
              :items-per-page-options="rowsPerPage"
              v-model="selectedTableItems"
              show-select
              item-value="cldbid"
            >
              <template #item.name="{ item }">
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn icon v-bind="props">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item :to="`/client/${item.cldbid}/ban`">
                      <v-list-item-title>封禁用户</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openRemoveDialog([item])">
                      <v-list-item-title>删除用户记录</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
              <template #item.clientCreated="{ item }">
                {{ new Date(item.clientCreated * 1000).toLocaleString() }}
              </template>
              <template #item.clientLastconnected="{ item }">
                {{
                  new Date(item.clientLastconnected * 1000).toLocaleString()
                }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-dialog max-width="500px" v-model="dialog">
        <v-card>
          <v-card-title>删除用户记录</v-card-title>
          <v-card-text>
            确定要从服务器数据库中删除
            <b v-if="clientRemoveList.length === 1">{{
              clientRemoveList[0].clientNickname
            }}</b>
            <b v-else>所有选中的用户</b>吗？此操作无法撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="dialog = false" color="primary">取消</v-btn>
            <v-btn variant="text" @click="deleteClient" color="error">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-row>
  </v-container>
</template>

<script>
import notify from "@/notify";
import clientService from "@/services/clientService";
export default {
  data() {
    return {
      headers: [
        {
          title: "",
          key: "name",
          align: "start",
          sortable: false,
        },
        {
          title: "最后昵称",
          key: "clientNickname",
        },
        {
          title: "唯一标识（UID）",
          key: "clientUniqueIdentifier",
        },
        {
          title: "首次连接",
          key: "clientCreated",
        },
        {
          title: "最后连接",
          key: "clientLastconnected",
        },
        {
          title: "连接次数",
          key: "clientTotalconnections",
        },
        {
          title: "最后 IP",
          key: "clientLastip",
        },
        {
          title: "描述",
          key: "clientDescription",
        },
      ],
      clientdblist: [],
      search: "",
      rowsPerPage: [
        { value: 25, title: "25" },
        { value: 50, title: "50" },
        { value: 75, title: "75" },
        { value: -1, title: "All" },
      ],
      dialog: false,
      clientRemoveList: [],
      selectedTableItems: [],
      clientAvatarDialog: false,
    };
  },
  methods: {
    openRemoveDialog(clients) {
      this.clientRemoveList = clients;

      this.dialog = true;
    },
    getClientDbList() {
      return clientService.listDatabase();
    },
    async deleteClient() {
      try {
        for (let client of this.clientRemoveList) {
          await clientService.remove(client.cldbid);
        }
      } catch (err) {
        notify.error(err.message);
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
        this.clientdblist = await this.getClientDbList();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  created() {
    this.init();
  },
};
</script>

<style scoped>
.console-page { max-width: 1440px; padding: 22px 30px 50px; }

.content-card { overflow: hidden; }
@media (max-width: 600px) { .console-page { padding: 16px; } }
</style>
