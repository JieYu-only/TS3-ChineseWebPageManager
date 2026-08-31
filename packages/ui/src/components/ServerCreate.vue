<template>
  <v-container>
    <v-layout justify-center>
      <v-flex lg6 md8 sm8 xs12>
        <v-card>
          <v-card-title>创建服务器</v-card-title>
          <v-card-text>
            <v-form v-model="valid">
              <v-layout justify-space-between wrap>
                <v-flex xs12>
                  <v-text-field
                    v-model="serverName"
                    label="服务器名称"
                    :disabled="$store.state.query.loading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 md4>
                  <v-text-field
                    v-model="serverPort"
                    label="端口"
                    type="number"
                    :disabled="$store.state.query.loading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12 md4>
                  <v-text-field
                    v-model="maxClients"
                    label="最大用户数"
                    type="number"
                    :disabled="$store.state.query.loading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-flex>
                <v-flex xs12>
                  <key-text-field
                    v-model="token"
                    label="生成的服务器密钥"
                  ></key-text-field>
                </v-flex>
              </v-layout>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="createServer" :disabled="!valid" color="primary"
              >创建</v-btn
            >
            <v-btn text @click="$router.go(-1)" color="primary">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import notify from "@/notify";
import serverService from "@/services/serverService";
export default {
  components: {
    KeyTextField: () => import("@/components/KeyTextField"),
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
      return this.$TeamSpeak.getServerList();
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
