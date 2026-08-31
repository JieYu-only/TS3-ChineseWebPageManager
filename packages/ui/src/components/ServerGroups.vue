<template>
  <group-list
    :groups="serverGroups"
    @add="addServerGroup"
    @remove="removeServerGroup"
    @edit="editServerGroup"
    @copy="copyServerGroup"
  ></group-list>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import groupService from "@/services/groupService";
export default {
  components: {
    GroupList: defineAsyncComponent(() => import("@/components/GroupList")),
  },
  data() {
    return {
      serverGroups: [],
    };
  },
  methods: {
    getServerGroupList() {
      return groupService.listServerGroups();
    },
    async addServerGroup(name, type) {
      try {
        await groupService.createServerGroup({ name, type });

        this.serverGroups = await this.getServerGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removeServerGroup(group, force) {
      try {
        await groupService.removeServerGroup({
          serverGroupId: group.sgid,
          force,
        });

        this.serverGroups = await this.getServerGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    editServerGroup(group) {
      this.$router.push({
        name: "servergroup-edit",
        params: { sgid: group.sgid },
      });
    },
    async copyServerGroup(
      sourceGroup,
      targetGroup,
      targetGroupName,
      overwriteGroup,
      groupType
    ) {
      try {
        await groupService.copyServerGroup({
          sourceGroupId: sourceGroup.sgid,
          targetGroupId: overwriteGroup ? targetGroup.sgid : 0,
          name: targetGroupName,
          type: groupType,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.serverGroups = await this.getServerGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async created() {
    try {
      this.serverGroups = await this.getServerGroupList();
    } catch (err) {
      notify.error(err.message);
    }
  },
};
</script>
