<template>
  <v-container>
    <v-row justify="center">
      <v-col lg="6" md="8" sm="8" cols="12">
        <v-card>
          <v-card-title>创建 API 密钥</v-card-title>
          <v-card-text>
            <v-select
              label="权限范围"
              :items="scopes"
              v-model="selectedScope"
            ></v-select>
            <v-text-field
              label="有效期"
              type="number"
              suffix="天"
              v-model="lifetime"
            ></v-text-field>
            <v-autocomplete
              label="用户"
              chips
              :items="dbClients"
              item-text="clientNickname"
              item-value="cldbid"
              v-model="selectedClient"
              deletable-chips
            >
              <template #item="{ item }">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item.clientNickname }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ item.cldbid }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </template>
            </v-autocomplete>
            <key-text-field
              v-model="apiKey"
              label="生成的 API 密钥"
            ></key-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              color="primary"
              :disabled="selectedScope === undefined"
              @click="addApiKey"
            >
              创建
            </v-btn>
            <v-btn text @click="$router.go(-1)" color="primary">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import notify from "@/notify";
export default {
  components: {
    KeyTextField: () => import("@/components/KeyTextField"),
  },
  data() {
    return {
      scopes: [
        { text: "管理", value: "manage" },
        { text: "写入", value: "write" },
        { text: "只读", value: "read" },
      ],
      selectedScope: undefined,
      dbClients: [],
      selectedClient: null,
      apiKey: "",
      lifetime: "", // in days
    };
  },
  methods: {
    getDbClients() {
      return this.$TeamSpeak.fullClientDBList();
    },
    async addApiKey() {
      try {
        let options = {
          scope: this.selectedScope,
        };

        // the invoker (the query user) by default
        if (this.selectedClient) options.cldbid = this.selectedClient;

        // 14 days by default
        if (this.lifetime) options.lifetime = this.lifetime;

        this.apiKey = await this.$TeamSpeak
          .execute("apikeyadd", options)
          .then((res) => res[0].apikey);
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async created() {
    try {
      this.dbClients = await this.getDbClients();
    } catch (err) {
      notify.error(err.message);
    }
  },
};
</script>
