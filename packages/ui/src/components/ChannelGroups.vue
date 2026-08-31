<template>
  <group-list
    :groups="channelGroups"
    kind="channel"
    @add="addChannelGroup"
    @remove="removeChannelGroup"
    @edit="editChannelGroup"
    @copy="copyChannelGroup"
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
      channelGroups: [],
    };
  },
  methods: {
    getChannelGroupList() {
      return groupService.listChannelGroups();
    },
    async addChannelGroup(name, type) {
      try {
        await groupService.createChannelGroup({ name, type });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.channelGroups = await this.getChannelGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removeChannelGroup(group, force) {
      try {
        await groupService.removeChannelGroup({
          channelGroupId: group.cgid,
          force,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.channelGroups = await this.getChannelGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    editChannelGroup(group) {
      this.$router.push({
        name: "channelgroup-edit",
        params: { cgid: group.cgid },
      });
    },
    async copyChannelGroup(
      sourceGroup,
      targetGroup,
      targetGroupName,
      overwriteGroup,
      groupType
    ) {
      try {
        await groupService.copyChannelGroup({
          sourceGroupId: sourceGroup.cgid,
          targetGroupId: overwriteGroup ? targetGroup.cgid : 0,
          name: targetGroupName,
          type: groupType,
        });
      } catch (err) {
        notify.error(err.message);
      }

      try {
        this.channelGroups = await this.getChannelGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  async created() {
    try {
      this.channelGroups = await this.getChannelGroupList();
    } catch (err) {
      notify.error(err.message);
    }
  },
};
</script>
