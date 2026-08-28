<template>
  <div>
    <v-card class="permission-card" elevation="0">
      <v-card-title>
        <v-layout justify-space-between wrap>
          <slot name="selectMenu"></slot>
          <v-flex xs12 sm5>
            <v-text-field
              v-model="filter"
          append-icon="mdi-filter-variant"
              label="筛选权限"
            ></v-text-field>
          </v-flex>
          <v-flex xs12 sm2>
            <v-checkbox
              v-model="onlyGranted"
              label="仅显示已授予"
              primary
            ></v-checkbox>
          </v-flex>
        </v-layout>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :no-data-text="
            $store.state.query.loading ? '正在加载……' : '暂无权限数据'
          "
          :headers="headers"
          :items="permissionlist"
          :footer-props="{ 'items-per-page-options': rowsPerPage }"
          :search="filter"
        >
          <template #item.actions="{ item }">
            <v-menu>
              <template #activator="{ on, attrs }">
                <v-btn icon v-bind="attrs" v-on="on">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="editPermission(item)">
                  <v-list-item-title>编辑权限</v-list-item-title>
                </v-list-item>
                <v-list-item @click="confirmDeletion(item)">
                  <v-list-item-title>移除权限</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
          <template
            v-if="editableContent.includes('permvalue')"
            #item.permvalue="{ item }"
          >
            {{ item.permvalue }}
          </template>
          <template
            v-if="editableContent.includes('permskip')"
            #item.permskip="{ item }"
          >
            <v-simple-checkbox
              v-if="typeof item.permskip !== 'object'"
              :value="!!item.permskip"
              disabled
            >
            </v-simple-checkbox>
          </template>
          <template
            v-if="editableContent.includes('permnegated')"
            #item.permnegated="{ item }"
          >
            <v-simple-checkbox
              v-if="typeof item.permnegated !== 'object'"
              :value="!!item.permnegated"
              disabled
            >
            </v-simple-checkbox>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>{{ editedPermission.permdesc }}</v-card-title>
        <v-card-text>
          <v-layout wrap justify-space-between>
            <v-flex xs12 v-if="editableContent.includes('permvalue')">
              <v-text-field
                label="权限值"
                type="number"
                v-model="editedPermission.permvalue"
              ></v-text-field>
            </v-flex>
            <v-flex xs5 v-if="editableContent.includes('permskip')">
              <v-checkbox
                label="跳过权限检查"
                v-model="editedPermission.permskip"
              ></v-checkbox>
            </v-flex>
            <v-flex xs5 v-if="editableContent.includes('permnegated')">
              <v-checkbox
                label="拒绝权限"
                v-model="editedPermission.permnegated"
                :disabled="type === 'Client Permissions' ? true : false"
              ></v-checkbox>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="savePermission" color="primary">保存</v-btn>
          <v-btn text @click="dialog = false" color="primary">取消</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>移除权限</v-card-title>
        <v-card-text>
          确定要移除权限 <b>{{ editedPermission.permname }}</b> 吗？
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="removePermission" color="error">移除</v-btn>
          <v-btn text @click="deleteDialog = false" color="primary"
            >取消</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
export default {
  props: {
    type: String, // e.g. Server Group, Client Channel etc...
    grantedPermissions: Array, // current permission that are set for the group, client etc...
    editableContent: Array, // e.g ['permvalue', 'permskip', 'permnegated']
  },
  data() {
    return {
      availablePermissions: [], // All available permissions that could be set
      onlyGranted: true, // Only show granted Permissions on default
      availableHeaders: [
        {
          text: "",
          align: "start",
          value: "actions",
          sortable: false,
        },
        {
          text: "权限标识",
          align: "left",
          value: "permname",
          sortable: false,
        },
        {
          text: "权限值",
          align: "left",
          value: "permvalue",
          sortable: false,
        },
        {
          text: "跳过检查",
          align: "left",
          value: "permskip",
          sortable: false,
        },
        {
          text: "拒绝",
          align: "left",
          value: "permnegated",
          sortable: false,
        },
      ],
      rowsPerPage: [50, 100, 150, -1],
      filter: "", // Filter table content
      dialog: false, // Shows the edit lightbox
      deleteDialog: false,
      editedPermission: {
        permdesc: "",
        permname: "",
        permid: null,
        permnegated: null,
        permskip: null,
        permvalue: null,
      },
    };
  },
  computed: {
    permissionlist() {
      let list = this.availablePermissions.map((permission) => {
        let permissionValues = this.grantedPermissions.find(
          (perm) => perm.permid === permission.permid
        )
          ? this.grantedPermissions.find(
              (perm) => perm.permid === permission.permid
            )
          : {
              permvalue: null,
              permnegated: null,
              permskip: null,
            };

        return {
          ...permission,
          ...permissionValues,
        };
      });

      if (this.onlyGranted) {
        return list.filter((permission) => permission.permvalue !== null);
      } else {
        return list;
      }
    },
    headers() {
      return this.availableHeaders.filter((header) => {
        for (let value of this.editableContent) {
          if (
            header.value === value ||
            header.value === "permname" ||
            header.value === "actions"
          ) {
            return header;
          }
        }
      });
    },
  },
  methods: {
    getPermissionlist() {
      return this.$TeamSpeak.execute("permissionlist");
    },
    editPermission(permissionValues) {
      this.editedPermission = {
        ...permissionValues,
      };
      this.editedPermission.permskip = Boolean(
        parseInt(this.editedPermission.permskip)
      ); // converts the string into a number an than into true or false
      this.editedPermission.permnegated = Boolean(
        parseInt(this.editedPermission.permnegated)
      );

      this.dialog = true;
    },
    savePermission() {
      this.$emit("save", this.editedPermission);
      this.dialog = false;
    },
    confirmDeletion(permissionValues) {
      this.editedPermission = {
        ...permissionValues,
      };

      this.deleteDialog = true;
    },
    removePermission() {
      this.$emit("remove", this.editedPermission);

      this.deleteDialog = false;
    },
  },
  async created() {
    try {
      this.availablePermissions = await this.getPermissionlist();

      // Emit the "loaded" event on the parent component to prevent wrong responses
      this.$emit("loaded");
    } catch (err) {
      this.$toast.error(err.message);
    }
  },
};
</script>

<style scoped>
.permission-card { overflow: hidden; }
</style>
