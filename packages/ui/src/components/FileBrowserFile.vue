<template>
  <div>
    <v-menu :offset="true" max-width="300px">
      <template #activator="{ props }">
        <span v-bind="props" class="tree-node-label">
          {{ item.name }}
          <span class="tree-node-sub">{{ fileSize }}</span>
        </span>
      </template>

      <v-list>
        <v-list-item title="下载文件" append-icon="mdi-download" @click="downloadFile"></v-list-item>
        <v-list-item title="删除文件" append-icon="mdi-delete" @click="deleteDialog = true"></v-list-item>
        <v-list-item title="重命名文件" append-icon="mdi-pencil" @click="renameDialog = true"></v-list-item>
      </v-list>
    </v-menu>

    <file-rename-dialog
      v-model="renameDialog"
      :item="item"
      @filerename="$emit('filerename', item)"
    ></file-rename-dialog>
    <file-delete-dialog
      v-model="deleteDialog"
      :item="item"
      @filedelete="$emit('filedelete', item)"
    ></file-delete-dialog>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";

import notify from "@/notify";
import {
  getDownloadUrl,
  initFileDownload as initDownloadRequest,
} from "@/api/fileTransfer";
import fileTransfer from "@/mixins/fileTransfer";

export default {
  components: {
    FileRenameDialog: defineAsyncComponent(() => import("@/components/FileRenameDialog")),
    FileDeleteDialog: defineAsyncComponent(() => import("@/components/FileDeleteDialog")),
  },
  mixins: [fileTransfer],
  props: {
    /**
     * File
     * @type {TreeItem}
     */
    item: Object,
  },
  data() {
    return {
      renameDialog: false,
      deleteDialog: false,
      newFileName: "",
    };
  },
  computed: {
    fileSize() {
      return this.formatBytes(this.item.size);
    },
  },
  methods: {
    initFileDownload(cpw = "", seekpos = 0) {
      return initDownloadRequest({
        cid: this.item.cid,
        path: this.getFilePath(this.item.path, this.item.name),
        cpw,
        seekpos,
      });
    },
    async downloadFile() {
      try {
        const { ticket } = await this.initFileDownload();
        const url = getDownloadUrl(ticket);

        window.open(url);
      } catch (err) {
        const message =
          (err.response && err.response.data && err.response.data.message) ||
          err.message ||
          "下载失败";
        notify.error(message);
      }
    },
    // Shamelessly copied from stackoverflow
    formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return "0 Bytes";

      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    },
  },
};
</script>

<style scoped>
.tree-node-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1.4;
}
.tree-node-sub {
  color: rgba(0, 0, 0, 0.55);
  font-size: 12px;
}
</style>
