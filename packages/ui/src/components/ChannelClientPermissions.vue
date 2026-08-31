<template>
  <v-container fluid class="console-page">
    <page-header title="频道用户权限" description="查看和配置频道内用户的权限" :breadcrumbs="['控制台', '权限管理', '频道用户权限']" />
    <v-row>
      <v-col cols="12">
        <permission-table
          :grantedPermissions="permissions"
          type="Channel Client Permissions"
          :editableContent="['permvalue']"
          @save="savePermission"
          @remove="removePermission"
          @loaded="init"
        >
          <template #selectMenu>
            <v-col sm="3" cols="12">
              <v-autocomplete
                :items="channelSelection"
                item-title="text"
                item-value="value"
                v-model="selectedChannel"
                label="频道"
                @change="changeChannel"
                :disabled="$store.state.query.loading"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" sm="3">
              <v-autocomplete
                :items="clientSelection"
                item-title="text"
                item-value="value"
                v-model="selectedClient"
                label="用户"
                @change="changeClient"
                :disabled="$store.state.query.loading"
              ></v-autocomplete>
            </v-col>
          </template>
        </permission-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import clientService from "@/services/clientService";
import channelService from "@/services/channelService";
import permissionService from "@/services/permissionService";
export default {
  components: {
    PermissionTable: defineAsyncComponent(() => import("@/components/PermissionTable")),
  },
  data() {
    return {
      permissions: [],
      channelId: this.$route.params.cid,
      clientDbId: this.$route.params.cldbid,
      clients: [],
      channels: [],
    };
  },
  computed: {
    channelSelection() {
      return this.channels.map((channel) => {
        return {
          text: channel.channelName,
          value: channel.cid,
        };
      });
    },
    selectedChannel: {
      get() {
        let channel = this.channels.find(
          (channel) => channel.cid == this.channelId
        );

        return channel && channel.cid;
      },
      set() {
        // Empty
      },
    },
    clientSelection() {
      return this.clients.map((client) => {
        return {
          text: client.clientNickname,
          value: client.cldbid,
        };
      });
    },
    selectedClient: {
      get() {
        let client = this.clients.find(
          (client) => client.cldbid == this.clientDbId
        );

        return client && client.cldbid;
      },
      set() {
        // Empty
      },
    },
  },
  methods: {
    getChannelClientPermList() {
      return permissionService.listChannelClientPermissions({
        channelId: this.channelId,
        clientDbId: this.clientDbId,
      });
    },
    getClientDbList() {
      return clientService.listDatabase();
    },
    getChannelList() {
      return channelService.list();
    },
    async savePermission(input) {
      try {
        await permissionService.addChannelClientPermission({
          channelId: this.channelId,
          clientDbId: this.clientDbId,
          permissionId: input.permissionId,
          value: input.value,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.permissions = await this.getChannelClientPermList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removePermission(input) {
      try {
        await permissionService.removeChannelClientPermission({
          channelId: this.channelId,
          clientDbId: this.clientDbId,
          permissionId: input.permissionId,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.permissions = await this.getChannelClientPermList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    changeClient(cldbid) {
      this.$router.push({
        name: "permissions-channelclient",
        params: {
          cid: this.channelId,
          cldbid: cldbid,
        },
      });
    },
    changeChannel(cid) {
      this.$router.push({
        name: "permissions-channelclient",
        params: {
          cid: cid,
          cldbid: this.clientDbId,
        },
      });
    },
    async init() {
      try {
        this.clients = await this.getClientDbList();
        this.channels = await this.getChannelList();

        if (!this.channelId && !this.clientDbId) {
          this.$router.replace({
            name: "permissions-channelclient",
            params: {
              cid: this.channels[0].cid,
              cldbid: this.clients[0].cldbid,
            },
          });
        }

        this.permissions = await this.getChannelClientPermList();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async beforeRouteUpdate(to, from, next) {
    try {
      this.channelId = to.params.cid;
      this.clientDbId = to.params.cldbid;
      this.permissions = await this.getChannelClientPermList();
    } catch (err) {
      notify.error(err.message);
    }

    next();
  },
};
</script>
