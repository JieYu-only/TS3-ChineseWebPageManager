<template>
  <v-container>
    <v-row justify="center">
      <v-col lg="6" md="8" sm="8" cols="12">
        <v-card>
          <v-card-title>创建服务器</v-card-title>
          <v-card-text>
            <v-form v-model="valid">
              <v-row justify="space-between">
                <v-col cols="12">
                  <v-text-field
                    v-model="serverName"
                    label="服务器名称"
                    :disabled="$store.state.query.loading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="serverPort"
                    label="端口"
                    type="number"
                    :disabled="$store.state.query.loading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="maxClients"
                    label="最大用户数"
                    type="number"
                    :disabled="$store.state.query.loading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <key-text-field
                    v-model="token"
                    label="生成的服务器密钥"
                  ></key-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="createServer" :disabled="!valid" color="primary"
              >创建</v-btn
            >
            <v-btn variant="text" @click="$router.go(-1)" color="primary">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import serverService from "@/services/serverService";
export default {
  components: {
    KeyTextField: defineAsyncComponent(() => import("@/components/KeyTextField")),
  },
  data() {
    return {
      valid: false,
      servers: [],
      serverName: "",
      serverPort: undefined,
      maxClients: 32,
      rules: {
        required: (value) => !!value || "Required.",
      },
      token: "",
    };
  },
  methods: {
    getServerList() {
      return serverService.list();
    },
    getAvailablePort() {
      return (
        Math.max(...this.servers.map((server) => server.virtualserverPort)) + 1
      );
    },
    async createServer() {
      try {
        let response = await serverService.create({
          virtualserverName: this.serverName,
          virtualserverPort: this.serverPort,
          virtualserverMaxclients: this.maxClients,
        });

        this.token = response.token;

        notify.success("服务器创建成功");

        await serverService.select(response.sid);
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async created() {
    try {
      this.servers = await this.getServerList();
      this.serverPort = this.getAvailablePort();
    } catch (err) {
      notify.error(err.message);
    }
  },
};
</script>
