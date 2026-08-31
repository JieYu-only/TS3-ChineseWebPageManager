<template>
  <v-container>
    <v-row justify="center">
      <v-col lg="6" md="8" sm="8" cols="12">
        <v-card>
          <v-card-title>编辑用户</v-card-title>
          <v-card-text>
            <v-text-field
              label="昵称"
              :placeholder="client.clientNickname"
              disabled
            ></v-text-field>
            <v-textarea label="描述" v-model="description"></v-textarea>
            <v-autocomplete
              :items="availableServerGroups"
              item-title="name"
              item-value="sgid"
              :item-props="(i) => ({ disabled: notSelectableGroup(i) })"
              chips
              label="服务器组"
              multiple
              v-model="selectedGroups"
            >
              <template #item="{ item, props }">
                <v-list-item
                  v-bind="props"
                  :title="item.raw.name"
                  :subtitle="getServerGroupTypeName(item.raw.type)"
                >
                  <template #prepend="{ isSelected }">
                    <v-checkbox :model-value="isSelected" hide-details></v-checkbox>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="save" color="primary">保存</v-btn>
            <v-btn variant="text" @click="$router.go(-1)" color="primary">取消</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import notify from "@/notify";
import clientService from "@/services/clientService";
import groupService from "@/services/groupService";
export default {
  data() {
    return {
      client: {},
      clientId: this.$route.params.clid,
      servergroups: [],
      selectedGroups: [],
      description: "",
      redirection: "",
      defaultServerGroupId: undefined,
    };
  },
  computed: {
    // Clients can only be member of a regular or a ServerQuery group.
    // Order the groups by the type. Regular groups are listed first.
    availableServerGroups() {
      return this.servergroups
        .filter(({ type }) => type === 1 || type === 2)
        .sort((a, b) => a.type - b.type);
    },
  },
  methods: {
    getServerGroupTypeName(num) {
      const types = { 1: "常规服务器组", 2: "ServerQuery 管理组" };
      return types[num];
    },
    /**
     * You can only add clients to regular server groups. Except the default guest group.
     * @see {@link https://forum.teamspeak.com/threads/125241-Regular-Group-Type-VS-Server-Query-Group-Type-What-Is-It-Used-For?p=431057#post431057}
     * @see {@link https://community.teamspeak.com/t/how-can-i-add-a-group-template/9390/2}
     */
    notSelectableGroup({ sgid, type }) {
      if (sgid === this.defaultServerGroupId) {
        return true;
      } else if (type === 2) {
        return true;
      } else {
        return false;
      }
    },
    getDefaultServerGroupId() {
      return groupService.defaultServerGroupId();
    },
    getClientInfo() {
      return clientService.info(this.clientId);
    },
    getServergroupList() {
      return groupService.listServerGroups();
    },
    async save() {
      try {
        await this.changeDescription();
        await this.addServergroups();
        await this.removeServergroups();

        notify.success("用户信息已更新");
      } catch (err) {
        notify.error(err.message);
      }

      this.init();
    },
    getClientServergroups() {
      return this.client.clientServergroups;
    },
    getClientDescription() {
      // if not null
      return this.client.clientDescription
        ? this.client.clientDescription
        : "";
    },
    addServergroups() {
      let groupAddList = this.selectedGroups.filter(
        (sgid) => !this.getClientServergroups().includes(sgid)
      );

      return this.changeMemberships("add", groupAddList);
    },
    removeServergroups() {
      let groupRemoveList = this.getClientServergroups().filter(
        (sgid) => !this.selectedGroups.includes(sgid)
      );

      return this.changeMemberships("remove", groupRemoveList);
    },
    async changeMemberships(type, list) {
      for (let sgid of list) {
        if (type === "add") {
          await groupService.addClientToServerGroup({
            serverGroupId: sgid,
            clientDbId: this.client.clientDatabaseId,
          });
        } else {
          await groupService.removeClientFromServerGroup({
            serverGroupId: sgid,
            clientDbId: this.client.clientDatabaseId,
          });
        }
      }
    },
    async changeDescription() {
      await clientService.edit(this.clientId, {
        clientDescription: this.description,
      });
    },
    async init() {
      try {
        this.client = await this.getClientInfo();

        this.servergroups = await this.getServergroupList();
        this.defaultServerGroupId = await this.getDefaultServerGroupId();

        this.selectedGroups = this.getClientServergroups();
        this.description = this.getClientDescription();
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
