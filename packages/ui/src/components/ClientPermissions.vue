<template>
  <v-container fluid class="console-page">
    <page-header title="用户权限" description="查看和配置单个用户的权限" :breadcrumbs="['控制台', '权限管理', '用户权限']" />
    <v-layout>
      <v-flex xs12>
        <permission-table
          type="Client Permissions"
          :grantedPermissions="clientPermissions"
          :editableContent="['permvalue', 'permskip']"
          @save="savePermission"
          @remove="removePermission"
          @loaded="init"
        >
          <template #selectMenu>
            <v-flex sm3 xs12>
              <v-autocomplete
                :items="clientSelection"
                v-model="selectedClient"
                @change="changeClient"
                label="用户"
                :disabled="$store.state.query.loading"
              ></v-autocomplete>
            </v-flex>
          </template>
        </permission-table>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import notify from "@/notify";
import clientService from "@/services/clientService";
import permissionService from "@/services/permissionService";
export default {
  components: {
    PermissionTable: () => import("@/components/PermissionTable.vue"),
  },
  data() {
    return {
      clientPermissions: [],
      clients: [],
      clientDbId: this.$route.params.cldbid,
    };
  },
  computed: {
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

        return (
          client && {
            text: client.clientNickname,
            value: client.cldbid,
          }
        );
      },
      set() {
        //
      },
    },
  },
  methods: {
    getClientPermissions() {
      return permissionService.listClientPermissions(this.clientDbId);
    },
    getClientdblist() {
      return clientService.listDatabase();
    },
    changeClient(cldbid) {
      this.$router.push({
        name: "permissions-client",
        params: {
          cldbid: cldbid,
        },
      });
    },
    async savePermission(input) {
      try {
        await permissionService.addClientPermission({
          clientDbId: this.clientDbId,
          permissionId: input.permissionId,
          value: input.value,
          skip: input.skip,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.clientPermissions = await this.getClientPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removePermission(input) {
      try {
        await permissionService.removeClientPermission({
          clientDbId: this.clientDbId,
          permissionId: input.permissionId,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.clientPermissions = await this.getClientPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async init() {
      try {
        this.clients = await this.getClientdblist();

        if (!this.clientDbId) {
          this.$router.replace({
            name: "permissions-client",
            params: {
              cldbid: this.clients[0].cldbid,
            },
          });
        }

        this.clientPermissions = await this.getClientPermissions();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async beforeRouteUpdate(to, from, next) {
    try {
      this.clientDbId = to.params.cldbid;
      this.clientPermissions = await this.getClientPermissions();
    } catch (err) {
      notify.error(err.message);
    }

    next();
  },
};
</script>
