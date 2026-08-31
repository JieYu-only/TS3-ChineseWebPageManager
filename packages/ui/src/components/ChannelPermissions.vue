<template>
  <v-container fluid class="console-page">
    <page-header title="频道权限" description="查看和配置频道的访问权限" :breadcrumbs="['控制台', '权限管理', '频道权限']" />
    <v-row>
      <v-col cols="12">
        <permission-table
          :grantedPermissions="permissions"
          type="Channel Permissions"
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
                @change="changeChannel"
                label="频道"
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
import channelService from "@/services/channelService";
import permissionService from "@/services/permissionService";
export default {
  components: {
    PermissionTable: defineAsyncComponent(() => import("@/components/PermissionTable")),
  },
  data() {
    return {
      permissions: [],
      channels: [],
      channelId: this.$route.params.cid,
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
        //
      },
    },
  },
  methods: {
    getChannelPermissions() {
      return permissionService.listChannelPermissions(this.channelId);
    },
    getChannelList() {
      return channelService.list();
    },
    async savePermission(input) {
      try {
        await permissionService.addChannelPermission({
          channelId: this.channelId,
          permissionId: input.permissionId,
          value: input.value,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.permissions = await this.getChannelPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removePermission(input) {
      try {
        await permissionService.removeChannelPermission({
          channelId: this.channelId,
          permissionId: input.permissionId,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.permissions = await this.getChannelPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
    changeChannel(cid) {
      this.$router.push({
        name: "permissions-channel",
        params: {
          cid: cid,
        },
      });
    },
    async init() {
      try {
        this.channels = await this.getChannelList();

        if (!this.channelId) {
          this.$router.replace({
            name: "permissions-channel",
            params: {
              cid: this.channels[0].cid,
            },
          });
        }

        this.permissions = await this.getChannelPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async beforeRouteUpdate(to, from, next) {
    try {
      this.channelId = to.params.cid;
      this.permissions = await this.getChannelPermissions();
    } catch (err) {
      notify.error(err.message);
    }

    next();
  },
};
</script>
