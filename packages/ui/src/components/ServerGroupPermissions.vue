<template>
  <v-container fluid class="console-page">
    <page-header title="服务器组权限" description="查看和配置服务器组的跨频道权限" :breadcrumbs="['控制台', '权限管理', '服务器组权限']" />
    <v-row>
      <v-col cols="12">
        <permission-table
          :grantedPermissions="serverGroupPermissions"
          type="Server Groups"
          :editableContent="['permvalue', 'permskip', 'permnegated']"
          @save="savePermission"
          @remove="removePermission"
          @loaded="init"
        >
          <template #selectMenu>
            <v-col sm="3" cols="12">
              <v-select
                :items="allGroups"
                v-model="selectedGroupId"
                @change="changeGroup"
                label="服务器组"
                :disabled="$store.state.query.loading"
                item-title="name"
                item-value="sgid"
              >
                <template #item="{ item, props }">
                  <v-list-item
                    v-bind="props"
                    :title="item.raw.name"
                    :subtitle="`(${item.raw.sgid})`"
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
    PermissionTable: defineAsyncComponent(() => import("@/components/PermissionTable.vue")),
  },
  data() {
    return {
      serverGroupPermissions: [],
      servergroups: [],
      selectedGroupId: parseInt(this.$route.params.sgid),
    };
  },
  computed: {
    allGroups() {
      return [
        { type: "subheader", title: "常规服务器组" },
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
      return this.servergroups.filter((group) => group.type === 1);
    },
    templateGroups() {
      return this.servergroups.filter((group) => group.type === 0);
    },
    serverQueryGroups() {
      return this.servergroups.filter((group) => group.type === 2);
    },
  },
  methods: {
    getServergroupPermissions() {
      return permissionService.listServerGroupPermissions(this.selectedGroupId);
    },
    getServergrouplist() {
      return groupService.listServerGroups();
    },
    changeGroup(sgid) {
      this.$router.push({
        name: "permissions-servergroup",
        params: {
          sgid: sgid,
        },
      });
    },
    async savePermission(input) {
      try {
        await permissionService.addServerGroupPermission({
          serverGroupId: this.selectedGroupId,
          permissionId: input.permissionId,
          value: input.value,
          skip: input.skip,
          negated: input.negated,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.serverGroupPermissions = await this.getServergroupPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removePermission(input) {
      try {
        await permissionService.removeServerGroupPermission({
          serverGroupId: this.selectedGroupId,
          permissionId: input.permissionId,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.serverGroupPermissions = await this.getServergroupPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async init() {
      try {
        this.servergroups = await this.getServergrouplist();

        if (!this.selectedGroupId) {
          this.$router.replace({
            name: "permissions-servergroup",
            params: {
              sgid: this.servergroups[0].sgid,
            },
          });
        }

        this.serverGroupPermissions = await this.getServergroupPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async beforeRouteUpdate(to, from, next) {
    try {
      this.selectedGroupId = parseInt(to.params.sgid);
      this.serverGroupPermissions = await this.getServergroupPermissions();
    } catch (err) {
      notify.error(err.message);
    }

    next();
  },
};
</script>
