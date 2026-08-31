<template>
  <div>
    <v-menu :offset="true" max-width="300px">
      <template #activator="{ props }">
        <span v-bind="props" class="tree-node-label">
          {{ item.name }}
        </span>
      </template>

      <v-list>
        <v-list-item title="上传文件" append-icon="mdi-upload" @click="goToUploadRoute"></v-list-item>
        <v-list-item title="创建子文件夹" append-icon="mdi-plus" @click="openSubfolderDialog"></v-list-item>
        <v-list-item title="重命名文件夹" append-icon="mdi-pencil" :disabled="item.type === undefined" @click="renameDialog = true"></v-list-item>
        <v-list-item title="删除文件夹" append-icon="mdi-delete" :disabled="item.type === undefined" @click="deleteDialog = true"></v-list-item>
      </v-list>
    </v-menu>

    <v-dialog v-model="subfolderDialog" max-width="500px">
      <v-card>
        <v-card-title>创建文件夹</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newSubfolderName"
            label="文件夹名称"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="createSubfolder" color="primary">确定</v-btn>
          <v-btn variant="text" @click="subfolderDialog = false" color="primary"
            >取消</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <file-rename-dialog
      v-model="renameDialog"
      :item="item"
      @filerename="$emit('folderrename', item)"
    ></file-rename-dialog>
    <file-delete-dialog
      v-model="deleteDialog"
      :item="item"
      @filedelete="$emit('folderdelete', item)"
    ></file-delete-dialog>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import Path from "path-browserify";
import fileService from "@/services/fileService";

export default {
  components: {
    FileRenameDialog: defineAsyncComponent(() => import("@/components/FileRenameDialog")),
    FileDeleteDialog: defineAsyncComponent(() => import("@/components/FileDeleteDialog")),
  },
  props: {
    /**
     * Channel or folder
     * @type {TreeItem}
     */
    item: Object,
  },
  data() {
    return {
      subfolderDialog: false,
      deleteDialog: false,
      renameDialog: false,
      newSubfolderName: "",
    };
  },
  methods: {
    openSubfolderDialog() {
      this.subfolderDialog = true;

      this.newSubfolderName = "";
    },
    async createSubfolder() {
      let { cid, path, name } = this.item;
      let currentPath = path ? Path.join(path, name) : "/";

      try {
        await fileService.createDirectory({
          channelId: cid,
          dirname: Path.join(currentPath, this.newSubfolderName),
        });

        this.subfolderDialog = false;
      } catch (err) {
        notify.error(err.message);
      }

      this.$emit("subfoldercreate", this.item);
    },
    goToUploadRoute() {
      let uploadRoute = {
        name: "file-upload",
        params: {
          cid: this.item.cid,
        },
      };

      if (this.item.path) {
        uploadRoute.query = {
          path: Path.join(this.item.path, this.item.name),
        };
      }

      this.$router.push(uploadRoute);
    },
  },
};
</script>

<style scoped>
.tree-node-label {
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  line-height: 1.4;
}
</style>
