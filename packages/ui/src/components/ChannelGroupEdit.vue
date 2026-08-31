<template>
  <v-container>
    <v-row>
      <v-col md="6" sm="8" cols="12" offset-md="3" offset-sm="2">
        <v-card>
          <v-card-title>编辑频道组</v-card-title>
          <v-card-text>
            <v-text-field
              label="频道组名称"
              v-model="channelGroupName"
              :disabled="$store.state.query.loading"
            ></v-text-field>
            <v-autocomplete
              :items="channelSelection"
              item-title="text"
              item-value="value"
              label="频道"
              v-model="selectedChannel"
              :disabled="$store.state.query.loading"
            ></v-autocomplete>
            <group-client-list
              v-model="selectedClients"
              :clientDbList="clients"
              :disabled="disabled || $store.state.query.loading"
            ></group-client-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="save('close')" color="primary">保存</v-btn>
            <v-btn variant="text" @click="$router.go(-1)" color="primary">取消</v-btn>
            <v-btn variant="text" @click="save('apply')" color="primary">应用</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import channelService from "@/services/channelService";
import clientService from "@/services/clientService";
import groupService from "@/services/groupService";
export default {
  components: {
    GroupClientList: defineAsyncComponent(() => import("@/components/GroupClientList")),
  },
  data() {
    return {
      channelGroup: {},
      channelGroupId: this.$route.params.cgid,
      defaultChannelGroupId: undefined, // for removing clients
      channels: [],
      selectedChannel: undefined, // current cid
      clients: [],
      selectedClients: [],
      currentClients: [],
      disabled: true,
      maxVisibleClients: 11,
      initChannelGroupName: undefined,
    };
  },
  computed: {
    channelGroupName: {
      get() {
        return this.channelGroup.name;
      },
      set(name) {
        this.channelGroup.name = name;
      },
    },
    channelSelection() {
      return this.channels.map((channel) => {
        return {
          text: channel.channelName,
          value: channel.cid,
        };
      });
    },
    clientSelection() {
      return this.clients.map((client) => {
        return {
          text: `${client.clientNickname} (${client.cldbid})`,
          value: client.cldbid,
          uid: client.clientUniqueIdentifier,
        };
      });
    },
  },
  methods: {
    getDefaultChannelGroup() {
      return groupService.defaultChannelGroupId();
    },
    async getChannelGroup() {
      const list = await groupService.listChannelGroups();
      return list.find((group) => group.cgid == this.channelGroupId); // just double '==' cause this.$route.params.cgid is always a string
    },
    getChannelList() {
      return channelService.list();
    },
    getClientDbList() {
      return clientService.listDatabase();
    },
    getChannelGroupClientList() {
      return groupService.listChannelGroupClients({
        channelGroupId: this.channelGroupId,
        channelId: this.selectedChannel,
      });
    },
    async renameChannelGroupName() {
      try {
        /** @see {@link https://github.com/joni1802/ts3-manager/issues/27} */
        if (this.channelGroupName !== this.initChannelGroupName) {
          await groupService.renameChannelGroup({
            channelGroupId: this.channelGroupId,
            name: this.channelGroupName,
          });
        }
      } catch (err) {
        notify.error(err.message);
      }
    },
    async changeMembers(list, cgid) {
      for (let client of list) {
        try {
          await groupService.assignClientChannelGroup({
            channelGroupId: cgid,
            channelId: this.selectedChannel,
            clientDbId: client.cldbid,
          });
        } catch (err) {
          notify.error(err.message);
        }
      }
    },
    // Remove means: put client in the default channel group of the virtual server
    async removeMembers() {
      let clientRemoveList = this.currentClients.filter((currentClient) => {
        return !this.selectedClients.find(
          (client) => client.cldbid === currentClient.cldbid
        );
      });

      await this.changeMembers(clientRemoveList, this.defaultChannelGroupId);
    },
    async addMembers() {
      let clientAddList = this.selectedClients.filter((client) => {
        return !this.currentClients.find(
          (currentClient) => currentClient.cldbid === client.cldbid
        );
      });

      await this.changeMembers(clientAddList, this.channelGroupId);
    },
    async save(action) {
      try {
        await this.renameChannelGroupName();
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
          try {
            this.channelGroup = await this.getChannelGroup();
          } catch (err) {
            notify.error(err.message);
          }

          try {
            // It is possible to just rename the group without selecting a specific channel
            if (this.selectedChannel) {
              this.selectedClients = await this.getChannelGroupClientList();
              this.currentClients = [...this.selectedClients];
            }
          } catch (err) {
            notify.error(err.message);
          }
      }
    },
  },
  async created() {
    try {
      this.defaultChannelGroupId = await this.getDefaultChannelGroup();
      this.channelGroup = await this.getChannelGroup();
      this.initChannelGroupName = this.channelGroup.name;
      this.channels = await this.getChannelList();
      this.clients = await this.getClientDbList();
    } catch (err) {
      notify.error(err.message);
    }
  },
  watch: {
    async selectedChannel() {
      this.disabled = false;

      this.selectedClients = await this.getChannelGroupClientList();
      this.currentClients = [...this.selectedClients];
    },
  },
};
</script>
