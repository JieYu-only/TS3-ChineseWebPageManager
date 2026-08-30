<template>
  <v-container fluid class="console-page">
    <page-header title="频道组权限" description="查看和配置频道组的权限" :breadcrumbs="['控制台', '权限管理', '频道组权限']" />
    <v-layout>
      <v-flex xs12>
        <permission-table
          :grantedPermissions="permissions"
          type="Channel Groups"
          :editableContent="['permvalue']"
          @save="savePermission"
          @remove="removePermission"
          @loaded="init"
        >
          <template #selectMenu>
            <v-flex sm3 xs12>
              <v-select
                :items="allGroups"
                v-model="selectedGroupId"
                @change="changeChannelGroup"
                label="频道组"
                :disabled="$store.state.query.loading"
                item-text="name"
                item-value="cgid"
              >
                <template #item="{ item }">
                  <v-list-item-content>
                    <v-list-item-title>{{ item.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      ({{ item.cgid }})
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </template>
              </v-select>
            </v-flex>
          </template>
        </permission-table>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  components: {
    PermissionTable: () => import("@/components/PermissionTable"),
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
        { header: "常规频道组" },
        ...this.regularGroups,
        { divider: true },
        { header: "模板组" },
        ...this.templateGroups,
        { divider: true },
        { header: "ServerQuery 管理组" },
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
      return this.$TeamSpeak.execute("channelgrouppermlist", {
        cgid: this.selectedGroupId,
      });
    },
    getChannelGroupList() {
      return this.$TeamSpeak.getChannelGroupList();
    },
    async savePermission(permission) {
      let { permid, permvalue } = permission;

      try {
        await this.$TeamSpeak.execute("channelgroupaddperm", {
          cgid: this.selectedGroupId,
          permid: permid,
          permvalue: permvalue,
        });
      } catch (err) {
        this.$toast.error(err.message);
      }

      try {
        this.permissions = await this.getChannelGroupPermList();
      } catch (err) {
        this.$toast.error(err.message);
      }
    },
    async removePermission(permission) {
      let { permid } = permission;

      try {
        await this.$TeamSpeak.execute("channelgroupdelperm", {
          cgid: this.selectedGroupId,
          permid: permid,
        });
      } catch (err) {
        this.$toast.error(err.message);
      }

      try {
        this.permissions = await this.getChannelGroupPermList();
      } catch (err) {
        this.$toast.error(err.message);
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
        this.$toast.error(err.message);
      }
    },
  },
  async beforeRouteUpdate(to, from, next) {
    try {
      this.selectedGroupId = parseInt(to.params.cgid);
      this.permissions = await this.getChannelGroupPermList();
    } catch (err) {
      this.$toast.error(err.message);
    }

    next();
  },
};
</script>

