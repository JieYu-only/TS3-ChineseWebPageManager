<template>
  <v-container>
    <v-layout>
      <v-flex xs12 sm6 offset-sm3>
        <v-card>
          <v-card-title>编辑服务器组</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="serverGroupName"
              label="服务器组名称"
              :disabled="$store.state.query.loading"
            ></v-text-field>
            <group-client-list
              v-model="serverGroupClients"
              :clientDbList="clients"
              :disabled="
                $store.state.query.loading ||
                serverGroup.type === 0 ||
                serverGroup.type === 2
              "
            ></group-client-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="save('close')"
              :disabled="$store.state.query.loading"
              color="primary"
              >保存</v-btn
            >
            <v-btn text @click="$router.go(-1)" color="primary">取消</v-btn>
            <v-btn
              text
              @click="save('apply')"
              :disabled="$store.state.query.loading"
              color="primary"
              >应用</v-btn
            >
          </v-card-actions>
        </v-card>
        <v-dialog v-model="swag"> </v-dialog>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import notify from "@/notify";
import clientService from "@/services/clientService";
import groupService from "@/services/groupService";
export default {
  components: {
    GroupClientList: () => import("@/components/GroupClientList"),
  },
  data() {
    return {
      serverGroupId: this.$route.params.sgid,
      serverGroup: {},
      serverGroupClients: [],
      currentServerGroupClients: [],
      clients: [],
      maxVisibleClients: 11,
      swag: false,
      initServerGroupName: undefined,
    };
  },
  computed: {
    availableClients() {
      return this.clients.map((client) => {
        return {
          text: `${client.clientNickname} (${client.cldbid})`,
          value: client.cldbid,
          uid: client.clientUniqueIdentifier,
        };
      });
    },
    serverGroupName: {
      get() {
        return this.serverGroup.name;
      },
      set(name) {
        this.serverGroup.name = name;
      },
    },
  },
  methods: {
    async getServerGroup() {
      const list = await groupService.listServerGroups();
      return list.find((group) => group.sgid == this.serverGroupId);
    },
    getServerGroupClientList() {
      return groupService.listServerGroupClients(this.serverGroupId);
    },
    getClientDbList() {
      return clientService.listDatabase();
    },
    async renameServerGroup() {
      /** @see {@link https://github.com/joni1802/ts3-manager/issues/27} */
      if (this.serverGroup.name !== this.initServerGroupName) {
        await groupService.renameServerGroup({
          serverGroupId: this.serverGroupId,
          name: this.serverGroup.name,
        });
      }
    },
    async removeMembers() {
      let clientRemoveList = this.currentServerGroupClients.filter(
        (currentClient) => {
          return !this.serverGroupClients.find(
            (client) => currentClient.cldbid === client.cldbid
          );
        }
      );

      for (let client of clientRemoveList) {
        await groupService.removeClientFromServerGroup({
          serverGroupId: this.serverGroupId,
          clientDbId: client.cldbid,
        });
      }
    },
    async addMembers() {
      let clientAddList = this.serverGroupClients.filter((client) => {
        return !this.currentServerGroupClients.find(
          (currentClient) => client.cldbid === currentClient.cldbid
        );
      });

      for (let client of clientAddList) {
        await groupService.addClientToServerGroup({
          serverGroupId: this.serverGroupId,
          clientDbId: client.cldbid,
        });
      }
    },
    async save(action) {
      try {
        await this.renameServerGroup();
        await this.removeMembers();
        await this.addMembers();
      } catch (err) {
        notify.error(err.message);
      }

      switch (action) {
        case "close":
          this.$router.go(-1);
          break;
        case "apply":
          this.init();
      }
    },
    async init() {
      try {
        this.serverGroup = await this.getServerGroup();
        this.initServerGroupName = this.serverGroup.name;
        this.clients = await this.getClientDbList();
        this.serverGroupClients = await this.getServerGroupClientList();

        this.currentServerGroupClients = [...this.serverGroupClients];
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
