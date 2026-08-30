<template lang="html">
  <div>
    <v-menu offset-y max-width="300px">
      <template #activator="{ on, attrs }">
        <v-list-item v-bind="attrs" v-on="on">
          <v-list-item-content>
            <v-list-item-title>{{ item.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ fileSize }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
      </template>

      <v-list>
        <v-list-item @click="downloadFile">
          <v-list-item-action>
            <v-icon>mdi-download</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>下载文件</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="deleteDialog = true">
          <v-list-item-action>
            <v-icon>mdi-delete</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>删除文件</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="renameDialog = true">
          <v-list-item-action>
            <v-icon>mdi-pencil</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>重命名文件</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
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
import notify from "@/notify";
import {
  getDownloadUrl,
  initFileDownload as initDownloadRequest,
} from "@/api/fileTransfer";
import fileTransfer from "@/mixins/fileTransfer";

export default {
  components: {
    FileRenameDialog: () => import("@/components/FileRenameDialog"),
    FileDeleteDialog: () => import("@/components/FileDeleteDialog"),
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
