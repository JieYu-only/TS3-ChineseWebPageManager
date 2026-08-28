<template>
  <v-container fluid class="console-page">
    <div class="page-breadcrumb"><v-icon small>mdi-home</v-icon><span>控制台</span><v-icon x-small>mdi-chevron-right</v-icon><strong>密钥</strong></div>
    <div class="page-title-row"><div><h1>密钥列表</h1><p>创建和管理服务器组、频道组权限密钥</p></div><v-btn color="primary" elevation="0" :to="{ name: 'token-add' }"><v-icon left small>mdi-plus</v-icon>创建密钥</v-btn></div>
    <v-layout>
      <v-flex xs12>
        <v-card class="content-card" elevation="0">
          <v-card-title>
            <v-btn
              color="error"
              :disabled="!Boolean(selectedTableItems.length)"
              @click="openDeleteDialog(selectedTableItems)"
            >
              <v-icon left>mdi-delete</v-icon>
              删除所选
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-data-table
              :no-data-text="
                $store.state.query.loading ? '...loading' : $vuetify.noDataText
              "
              :headers="headers"
              :items="tokens"
              :footer-props="{ 'items-per-page-options': rowsPerPage }"
              show-select
              v-model="selectedTableItems"
              item-key="token"
            >
              <template #item.actions="{ item }">
                <v-menu>
                  <template #activator="{ on, attrs }">
                    <v-btn icon v-bind="attrs" v-on="on">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="openDeleteDialog([item])">
                      <v-list-item-title>删除密钥</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="copyToClipboard(item.token)">
                      <v-list-item-title>复制密钥</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
              <template #item.tokenCreated="{ item }">
                {{ new Date(item.tokenCreated * 1000).toLocaleString() }}
              </template>
              <template #item.tokenType="{ item }">
                <v-chip x-small :color="item.tokenType === 0 ? 'primary' : 'secondary'" text-color="white">{{ item.tokenType === 0 ? '服务器组' : '频道组' }}</v-chip>
              </template>
              <template #item.token="{ item }">
                <code class="token-value">{{ item.token }}</code>
                <v-btn icon x-small class="ml-1" @click="copyToClipboard(item.token)"><v-icon x-small>mdi-content-copy</v-icon></v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-flex>

      <v-dialog v-model="dialog" max-width="500px">
        <v-card>
          <v-card-title>删除密钥</v-card-title>
          <v-card-text>确定要删除所选密钥吗？此操作无法撤销。</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="dialog = false">取消</v-btn>
            <v-btn text color="error" @click="deleteToken">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-btn
        class="mobile-create"
        color="primary"
        dark
        :to="{ name: 'token-add' }"
      >
        <v-icon left>mdi-plus</v-icon>创建密钥
      </v-btn>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      dialog: false,
      tokens: [],
      headers: [
        { text: "", value: "actions", align: "start", sortable: false },
        { text: "密钥", value: "token" },
        { text: "类型", value: "tokenType" },
        { text: "用户组", value: "tokenId1" },
        { text: "频道", value: "tokenId2" },
        { text: "创建时间", value: "tokenCreated" },
        { text: "描述", value: "tokenDescription" },
      ],
      rowsPerPage: [25, 50, 75, -1],
      selectedTableItems: [],
      tokenRemoveList: [],
    };
  },
  methods: {
    getTokenList() {
      return this.$TeamSpeak.execute("tokenlist");
    },
    openDeleteDialog(tokens) {
      this.tokenRemoveList = tokens;

      this.dialog = true;
    },
    async deleteToken() {
      try {
        for (let token of this.tokenRemoveList) {
          await this.$TeamSpeak.execute("tokendelete", { token: token.token });
        }

        this.dialog = false;
      } catch (err) {
        this.$toast.error(err.message);
      }

      // v-model is not updating correctly when the content of the table changes.
      // Removed content is still in the selectedTableItems array.
      // This is a workaround for this vuetify bug.
      this.selectedTableItems = [];

      this.init();
    },
    copyToClipboard(token) {
      this.$clipboard(token);

      this.$toast.info("密钥已复制");
    },
    async init() {
      try {
        this.tokens = await this.getTokenList();
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
.console-page { max-width: 1440px; padding: 22px 30px 50px; }.page-breadcrumb { display:flex;align-items:center;gap:7px;margin-bottom:18px;color:#9099a8;font-size:12px;}.page-breadcrumb strong{color:#4b5668;font-weight:500}.page-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.page-title-row h1{margin:0;color:#19253b;font-size:23px}.page-title-row p{margin:4px 0 0;color:#929cab;font-size:12px}.content-card{overflow:hidden}.token-value{display:inline-block;max-width:290px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;white-space:nowrap}.mobile-create{display:none}@media(max-width:600px){.console-page{padding:16px}.page-title-row>.v-btn{display:none}.mobile-create{display:flex;margin:18px auto}}
</style>
