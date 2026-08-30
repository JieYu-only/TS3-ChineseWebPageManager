<template>
  <v-container fluid class="console-page">
    <div class="page-breadcrumb"><v-icon small>mdi-home</v-icon><span>控制台</span><v-icon x-small>mdi-chevron-right</v-icon><strong>{{ entityName }}</strong></div>
    <div class="page-title-row"><div><h1>{{ entityName }}</h1><p>{{ pageDescription }}</p></div><v-btn color="primary" elevation="0" @click="addDialog = true"><v-icon left small>mdi-plus</v-icon>创建{{ entityName }}</v-btn></div>
    <v-row>
      <v-col cols="12">
        <v-card class="content-card" elevation="0">
          <v-list>
            <template v-if="regularGroups.length">
              <v-subheader>常规{{ entityName }}</v-subheader>
              <v-list-item
                v-for="regularGroup in regularGroups"
                :key="regularGroup.sgid || regularGroup.cgid"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ regularGroup.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    ({{ regularGroup.sgid || regularGroup.cgid }})
                  </v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action>
                  <v-menu>
                    <template #activator="{ on, attrs }">
                      <v-btn icon v-bind="attrs" v-on="on">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="editGroup(regularGroup)">
                        <v-list-item-title>编辑{{ entityName }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="openCopyDialog(regularGroup)">
                        <v-list-item-title>复制{{ entityName }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="confirmDeletion(regularGroup)">
                        <v-list-item-title>删除{{ entityName }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-list-item-action>
              </v-list-item>

              <v-divider></v-divider>
            </template>

            <template v-if="templateGroups.length">
              <v-subheader>模板组</v-subheader>
              <v-list-item
                v-for="templateGroup in templateGroups"
                :key="templateGroup.sgid || templateGroup.cgid"
              >
                <v-list-item-content>
                  <v-list-item-title>{{
                    templateGroup.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle
                    >({{
                      templateGroup.sgid || templateGroup.cgid
                    }})</v-list-item-subtitle
                  >
                </v-list-item-content>
                <v-list-item-action>
                  <v-menu>
                    <template #activator="{ on, attrs }">
                      <v-btn icon v-bind="attrs" v-on="on">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="editGroup(templateGroup)">
                        <v-list-item-title>编辑{{ entityName }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="openCopyDialog(templateGroup)">
                        <v-list-item-title>复制{{ entityName }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="confirmDeletion(templateGroup)">
                        <v-list-item-title>删除{{ entityName }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-list-item-action>
              </v-list-item>
            </template>

            <template v-if="serverQueryGroups.length">
              <v-divider></v-divider>

              <v-subheader>ServerQuery 管理组</v-subheader>
              <v-list-item
                v-for="serverQueryGroup in serverQueryGroups"
                :key="serverQueryGroup.sgid || serverQueryGroup.cgid"
              >
                <v-list-item-content>
                  <v-list-item-title>{{
                    serverQueryGroup.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle
                    >({{
                      serverQueryGroup.sgid || serverQueryGroup.cgid
                    }})</v-list-item-subtitle
                  >
                </v-list-item-content>
                <v-list-item-action>
                  <v-menu>
                    <template #activator="{ on, attrs }">
                      <v-btn icon v-bind="attrs" v-on="on">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="editGroup(serverQueryGroup)">
                        <v-list-item-title>编辑{{ entityName }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="openCopyDialog(serverQueryGroup)">
                        <v-list-item-title>复制{{ entityName }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="confirmDeletion(serverQueryGroup)">
                        <v-list-item-title>删除{{ entityName }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-list-item-action>
              </v-list-item>
            </template>
          </v-list>
        </v-card>
      </v-col>
      <v-btn
        class="mobile-create"
        fab
        color="primary"
        fixed
        bottom
        right
        dark
        @click="addDialog = true"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-dialog v-model="removeDialog" max-width="500px">
        <v-card>
          <v-card-title>确认删除{{ entityName }}</v-card-title>
          <v-card-text>
            确定要删除{{ entityName }} <b>{{ selectedGroup.name }}</b> 吗？
            <v-checkbox
              v-model="forceDeletion"
              label="即使组内仍有用户也强制删除"
            ></v-checkbox>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="removeDialog = false"
              >取消</v-btn
            >
            <v-btn text color="primary" @click="removeGroup"
              >删除</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="addDialog" max-width="500px">
        <v-card>
          <v-card-title>创建{{ entityName }}</v-card-title>
          <v-card-text>
            <v-text-field v-model="groupName" :label="`${entityName}名称`"></v-text-field>
            <v-select
              :label="`${entityName}类型`"
              :items="groupTypes"
              v-model="selectedGroupType"
            ></v-select>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="addGroup">创建</v-btn>
            <v-btn text color="primary" @click="addDialog = false"
              >取消</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="copyDialog" max-width="500px">
        <v-card>
          <v-card-title>复制{{ entityName }}</v-card-title>
          <v-card-text>
            <v-select
              :label="`源${entityName}`"
              :items="allGroups"
              v-model="selectedGroup"
              :item-disabled="disabledSourceGroup"
              return-object
              :item-value="allGroups[0].sgid ? 'sgid' : 'cgid'"
              item-text="name"
            >
              <template #item="{ item }">
                <v-list-item-content>
                  <v-list-item-title>{{ item.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    ({{ item.sgid || item.cgid }})
                  </v-list-item-subtitle>
                </v-list-item-content>
              </template>
            </v-select>
            <v-row class="px-3">
              <v-checkbox
                label="覆盖现有组"
                hide-details
                class="mr-3 shrink"
                v-model="overwriteGroup"
              ></v-checkbox>
              <v-select
                :label="`目标${entityName}`"
                :disabled="!overwriteGroup"
                :items="allGroups"
                item-text="name"
                :item-disabled="disabledTargetGroup"
                return-object
                :item-value="allGroups[0].sgid ? 'sgid' : 'cgid'"
                v-model="selectedTargetGroup"
              >
                <template #item="{ item }">
                  <v-list-item-content>
                    <v-list-item-title>{{ item.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      ({{ item.sgid || item.cgid }})
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </template>
              </v-select>
            </v-row>
            <v-text-field
              :label="`新${entityName}名称`"
              :disabled="overwriteGroup"
              v-model="targetGroupName"
              autofocus
            ></v-text-field>
            <v-select
              :label="`新${entityName}类型`"
              :items="groupTypes"
              v-model="selectedTargetGroupType"
              :disabled="overwriteGroup"
            ></v-select>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text color="primary" @click="copyGroup">确定</v-btn>
            <v-btn text color="primary" @click="copyDialog = false"
              >取消</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    groups: Array,
    kind: {
      type: String,
      default: "server",
    },
  },
  data() {
    return {
      removeDialog: false,
      addDialog: false,
      copyDialog: false,
      groupName: "",
      selectedGroup: {},
      forceDeletion: false, // Delete group even if there are clients
      selectedGroupType: 1,
      groupTypes: [
        { text: "常规组", value: 1 },
        { text: "模板组", value: 0 },
        { text: "ServerQuery 管理组", value: 2 },
      ],
      overwriteGroup: false,
      selectedTargetGroup: {},
      selectedTargetGroupType: 1,
      targetGroupName: "",
    };
  },
  computed: {
    entityName() {
      return this.kind === "channel" ? "频道组" : "服务器组";
    },
    pageDescription() {
      return this.kind === "channel"
        ? "管理频道权限组、模板组及成员分配"
        : "管理服务器组、模板组及 ServerQuery 管理组";
    },
    allGroups() {
      return [
        { header: "常规组" },
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
      return this.groups.filter((group) => group.type === 1);
    },
    templateGroups() {
      return this.groups.filter((group) => group.type === 0);
    },
    serverQueryGroups() {
      return this.groups.filter((group) => group.type === 2);
    },
  },
  methods: {
    openCopyDialog(group) {
      this.selectedGroup = group;
      this.copyDialog = true;
      this.overwriteGroup = false;
    },
    copyGroup() {
      this.$emit(
        "copy",
        this.selectedGroup,
        this.selectedTargetGroup,
        this.targetGroupName,
        this.overwriteGroup,
        this.selectedTargetGroupType
      );
      this.copyDialog = false;
    },
    disabledSourceGroup(group) {
      return (
        (group.sgid && group.sgid === this.selectedTargetGroup.sgid) ||
        (group.cgid && group.cgid === this.selectedTargetGroup.cgid)
      );
    },
    disabledTargetGroup(group) {
      return (
        (group.sgid && group.sgid === this.selectedGroup.sgid) ||
        (group.cgid && group.cgid === this.selectedGroup.cgid)
      );
    },
    confirmDeletion(group) {
      this.selectedGroup = group;
      this.removeDialog = true;
    },
    removeGroup() {
      this.$emit("remove", this.selectedGroup, this.forceDeletion);
      this.removeDialog = false;
    },
    addGroup() {
      this.$emit("add", this.groupName, this.selectedGroupType);
      this.groupName = "";
      this.addDialog = false;
    },
    editGroup(group) {
      this.$emit("edit", group);
    },
    getGroupType(type) {
      const types = { 0: "模板组", 1: "常规组", 2: "ServerQuery 管理组" };
      return types[type];
    },
  },
  watch: {
    selectedTargetGroup(group) {
      this.targetGroupName = group.name;
      this.selectedTargetGroupType = group.type;
    },
    overwriteGroup(overwrite) {
      if (overwrite) {
        this.targetGroupName = this.selectedTargetGroup.name;
        this.selectedTargetGroupType = this.selectedTargetGroup.type;
      }
    },
  },
};
</script>

<style scoped>
.console-page{max-width:1440px;padding:22px 30px 50px}.page-breadcrumb{display:flex;align-items:center;gap:7px;margin-bottom:18px;color:#9099a8;font-size:12px}.page-breadcrumb strong{color:#4b5668;font-weight:500}.page-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.page-title-row h1{margin:0;color:#19253b;font-size:23px}.page-title-row p{margin:4px 0 0;color:#929cab;font-size:12px}.content-card{overflow:hidden}.mobile-create{display:none}@media(max-width:600px){.console-page{padding:16px}.page-title-row>.v-btn{display:none}.mobile-create{display:flex}}
</style>
