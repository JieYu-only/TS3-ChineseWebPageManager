<template>
  <v-container fluid class="console-page">
    <page-header title="频道组权限" description="查看和配置频道组的权限" :breadcrumbs="['控制台', '权限管理', '频道组权限']" />
    <v-row>
      <v-col cols="12">
        <permission-table
          :grantedPermissions="permissions"
          type="Channel Groups"
          :editableContent="['permvalue']"
          @save="savePermission"
          @remove="removePermission"
          @loaded="init"
        >
          <template #selectMenu>
            <v-col sm="3" cols="12">
              <v-select
                :items="allGroups"
                v-model="selectedGroupId"
                @change="changeChannelGroup"
                label="频道组"
                :disabled="$store.state.query.loading"
                item-title="name"
                item-value="cgid"
              >
                <template #item="{ item, props }">
                  <v-list-item
                    v-bind="props"
                    :title="item.raw.name"
                    :subtitle="`(${item.raw.cgid})`"
                  ></v-list-item>
                </template>
              </v-select>
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
import groupService from "@/services/groupService";
import permissionService from "@/services/permissionService";
export default {
  components: {
    PermissionTable: defineAsyncComponent(() => import("@/components/PermissionTable")),
  },
  data() {
    return {
      permissions: [],
      channelGroups: [],
      selectedGroupId: parseInt(this.$route.params.cgid),
    };
  },
  computed: {
    allGroups() {
      return [
        { type: "subheader", title: "常规频道组" },
        ...this.regularGroups,
        { type: "divider" },
        { type: "subheader", title: "模板组" },
        ...this.templateGroups,
        { type: "divider" },
        { type: "subheader", title: "ServerQuery 管理组" },
        ...this.serverQueryGroups,
      ];
    },
    regularGroups() {
      return this.channelGroups.filter((group) => group.type === 1);
    },
    templateGroups() {
      return this.channelGroups.filter((group) => group.type === 0);
    },
    serverQueryGroups() {
      return this.channelGroups.filter((group) => group.type === 2);
    },
  },
  methods: {
    getChannelGroupPermList() {
      return permissionService.listChannelGroupPermissions(this.selectedGroupId);
    },
    getChannelGroupList() {
      return groupService.listChannelGroups();
    },
    async savePermission(input) {
      try {
        await permissionService.addChannelGroupPermission({
          channelGroupId: this.selectedGroupId,
          permissionId: input.permissionId,
          value: input.value,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.permissions = await this.getChannelGroupPermList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removePermission(input) {
      try {
        await permissionService.removeChannelGroupPermission({
          channelGroupId: this.selectedGroupId,
          permissionId: input.permissionId,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.permissions = await this.getChannelGroupPermList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    changeChannelGroup(cgid) {
      this.$router.push({
        name: "permissions-channelgroup",
        params: {
          cgid: cgid,
        },
      });
    },
    async init() {
      try {
        this.channelGroups = await this.getChannelGroupList();

        if (!this.selectedGroupId) {
          this.$router.replace({
            name: "permissions-channelgroup",
            params: {
              cgid: this.channelGroups[0].cgid,
            },
          });
        }

        this.permissions = await this.getChannelGroupPermList();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async beforeRouteUpdate(to, from, next) {
    try {
      this.selectedGroupId = parseInt(to.params.cgid);
      this.permissions = await this.getChannelGroupPermList();
    } catch (err) {
      notify.error(err.message);
    }

    next();
  },
};
</script>
