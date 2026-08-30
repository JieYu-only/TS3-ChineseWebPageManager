<template lang="html">
  <div>
    <v-btn
      color="error"
      @click="dialog = true"
      :disabled="!!!selectedFiles.length"
    >
      <v-icon left>mdi-delete</v-icon>
      删除所选
    </v-btn>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>删除所选文件和文件夹</v-card-title>
        <v-card-text>
          确定要删除所有选中的文件和文件夹吗？此操作无法撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteFiles" color="primary">确定</v-btn>
          <v-btn text @click="dialog = false" color="primary">取消</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import notify from "@/notify";
import Path from "path-browserify";

export default {
  props: {
    /**
     * All selected files, folder and channels
     * @type {Array.<TreeItem>}
     */
    selectedFiles: Array,
  },
  data() {
    return {
      dialog: false,
    };
  },
  methods: {
    /**
     * Remove all selected child items if a the parent item is selected.
     * If a folder and a file inside that folder are selected, only the delete command for
     * the folder will be send to the ServerQuery.
     * @return {Array.<TreeItem>} - selected parent items
     */
    getRemoveList() {
      let removeList = [...this.selectedFiles];

      this.selectedFiles.forEach((file, index, array) => {
        let parentFile = array.find(
          (selectedFile) => file.pid === selectedFile.id
        );

        if (parentFile) {
          delete removeList[index];
        }
      });

      // reindex array
      return removeList.filter((file) => file);
    },

    /**
     * Send delete command for each file/folder to the ServerQuery and emit
     * an event to update the directory.
     */
    async deleteFiles() {
      let fileRemoveList = this.getRemoveList();

      try {
        for (let file of fileRemoveList) {
          // if it is a file or folder
          if (file.path !== undefined) {
            await this.$TeamSpeak.execute("ftdeletefile", {
              cid: file.cid,
              cpw: "",
              name: Path.join(file.path, file.name),
            });

            // if it is a channel
          } else {
            for (let childFile of file.children) {
              await this.$TeamSpeak.execute("ftdeletefile", {
                cid: file.cid,
                cpw: "",
                name: Path.join(childFile.path, childFile.name),
              });
            }
          }

          this.$emit("filedelete", file);
        }
      } catch (err) {
        notify.error(err.message);
      }

      this.dialog = false;
    },
  },
};
</script>
