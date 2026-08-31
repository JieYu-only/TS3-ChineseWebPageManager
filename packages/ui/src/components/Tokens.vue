<template>
  <v-container fluid class="console-page">
    <page-header title="密钥列表" description="创建和管理服务器组、频道组权限密钥" :breadcrumbs="['控制台', '密钥']">
      <template #actions>
        <v-btn color="primary" elevation="0" :to="{ name: 'token-add' }"><v-icon left small>mdi-plus</v-icon>创建密钥</v-btn>
      </template>
    </page-header>
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

    </v-layout>
  </v-container>
</template>

<script>
import notify from "@/notify";
import copyToClipboard from "@/utils/clipboard";
import tokenService from "@/services/tokenService";

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
      return tokenService.list();
    },
    openDeleteDialog(tokens) {
      this.tokenRemoveList = tokens;

      this.dialog = true;
    },
    async deleteToken() {
      try {
        for (let token of this.tokenRemoveList) {
          await tokenService.remove(token.token);
        }

        this.dialog = false;
      } catch (err) {
        notify.error(err.message);
      }

      // v-model is not updating correctly when the content of the table changes.
      // Removed content is still in the selectedTableItems array.
      // This is a workaround for this vuetify bug.
      this.selectedTableItems = [];

      this.init();
    },
    copyToClipboard(token) {
      copyToClipboard(token).then((ok) => {
        if (ok) notify.info("密钥已复制");
        else notify.error("复制失败，请手动复制");
      });
    },
    async init() {
      try {
        this.tokens = await this.getTokenList();
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
.content-card{overflow:hidden}.token-value{display:inline-block;max-width:290px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;white-space:nowrap}
</style>
