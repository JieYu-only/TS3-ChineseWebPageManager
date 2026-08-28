<template>
  <v-container fluid class="console-page">
    <div class="page-breadcrumb"><v-icon small>mdi-home</v-icon><span>控制台</span><v-icon x-small>mdi-chevron-right</v-icon><strong>API 密钥</strong></div>
    <div class="page-title-row"><div><h1>API 密钥</h1><p>创建和管理用于接口访问的 API 密钥</p></div><v-btn color="primary" elevation="0" @click="addApiKey"><v-icon left small>mdi-plus</v-icon>创建 API 密钥</v-btn></div>
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
    <v-btn class="mobile-create" fab color="primary" fixed bottom right dark @click="addApiKey">
      <v-icon>mdi-plus</v-icon>
    </v-btn>
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
        this.$toast.error(err.message);
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
        this.$toast.error(err.message);
      }
    },
  },
  created() {
    this.init();
  },
};
</script>

<style scoped>
.console-page{max-width:1440px;padding:22px 30px 50px}.page-breadcrumb{display:flex;align-items:center;gap:7px;margin-bottom:18px;color:#9099a8;font-size:12px}.page-breadcrumb strong{color:#4b5668;font-weight:500}.page-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.page-title-row h1{margin:0;color:#19253b;font-size:23px}.page-title-row p{margin:4px 0 0;color:#929cab;font-size:12px}.content-card{overflow:hidden}.mobile-create{display:none}@media(max-width:600px){.console-page{padding:16px}.page-title-row>.v-btn{display:none}.mobile-create{display:flex}}
</style>
