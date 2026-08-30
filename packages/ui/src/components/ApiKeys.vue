<template>
  <v-container fluid class="console-page">
    <page-header title="API 密钥" description="创建和管理用于接口访问的 API 密钥" :breadcrumbs="['控制台', 'API 密钥']">
      <template #actions>
        <v-btn color="primary" elevation="0" @click="addApiKey"><v-icon left small>mdi-plus</v-icon>创建 API 密钥</v-btn>
      </template>
    </page-header>
    <v-row>
      <v-col cols="12">
        <v-card class="content-card" elevation="0">
          <v-card-title>
            <v-btn
              color="error"
              :disabled="!selectedKeys.length"
              @click="deleteDialog = true"
            >
              <v-icon left>mdi-delete</v-icon>
              删除所选
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="tableItems"
              item-key="id"
              show-select
              v-model="selectedKeys"
            >
              <template #item.clientNickname="{ item }">
                <v-chip>{{ item.clientNickname }} ({{ item.cldbid }})</v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>删除 API 密钥</v-card-title>
        <v-card-text>
          确定要删除所选 API 密钥吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="primary" @click="deleteDialog = false">取消</v-btn>
          <v-btn text color="error" @click="removeApiKeys">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import notify from "@/notify";
export default {
  data() {
    return {
      headers: [
        {
          text: "所属用户",
          sortable: true,
          align: "start",
          value: "clientNickname",
        },
        {
          text: "作用范围",
          sortable: true,
          align: "start",
          value: "scope",
        },
        {
          text: "创建时间",
          sortable: true,
          align: "start",
          value: "createdAt",
        },
        {
          text: "过期时间",
          sortable: true,
          align: "start",
          value: "expiresAt",
        },
      ],
      apiKeys: [],
      dbClients: [],
      selectedKeys: [],
      deleteDialog: false,
    };
  },
  computed: {
    tableItems() {
      return this.apiKeys.map((key) => {
        let client = this.dbClients.find(
          (client) => client.cldbid === key.cldbid
        );

        return {
          id: key.id,
          clientNickname: client ? client.clientNickname : "serveradmin",
          cldbid: key.cldbid,
          scope: key.scope,
          createdAt: new Date(key.createdAt * 1000).toLocaleString(),
          expiresAt: new Date(key.expiresAt * 1000).toLocaleString(),
        };
      });
    },
  },
  methods: {
    addApiKey() {
      this.$router.push({ name: "apikey-add" });
    },
    getApiKeys() {
      return this.$TeamSpeak.execute("apikeylist", {
        cldbid: "*",
      });
    },
    getDbClients() {
      return this.$TeamSpeak.fullClientDBList();
    },
    async removeApiKeys() {
      try {
        for (let key of this.selectedKeys) {
          await this.$TeamSpeak.execute("apikeydel", { id: key.id });
        }

        this.deleteDialog = false;
      } catch (err) {
        notify.error(err.message);
      }

      // v-model is not updating correctly when the content of the table changes.
      // Removed content is still in the selectedKeys array.
      // This is a workaround for this vuetify bug.
      this.selectedKeys = [];

      this.init();
    },
    async init() {
      try {
        this.apiKeys = await this.getApiKeys();
        this.dbClients = await this.getDbClients();
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
.content-card{overflow:hidden}
</style>
