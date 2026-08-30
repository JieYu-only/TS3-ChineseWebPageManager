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
import notify from "@/notify";
export default {
  components: {
    GroupList: () => import("@/components/GroupList"),
  },
  data() {
    return {
      serverGroups: [],
    };
  },
  methods: {
    getServerGroupList() {
      return this.$TeamSpeak.getServerGroupList().then((list) => {
        return list;
      });
    },
    async addServerGroup(name, type) {
      try {
        await this.$TeamSpeak.execute("servergroupadd", { name, type });

        this.serverGroups = await this.getServerGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
    async removeServerGroup(group, force) {
      try {
        await this.$TeamSpeak.execute("servergroupdel", {
          sgid: group.sgid,
          force: +force,
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
        await this.$TeamSpeak.execute("servergroupcopy", {
          ssgid: sourceGroup.sgid,
          tsgid: overwriteGroup ? targetGroup.sgid : 0,
          // Even though the parameter "name" is ignored, when a target group is selected, it needs a value.
          // Otherwise the ServerQuery will throw an error.
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
