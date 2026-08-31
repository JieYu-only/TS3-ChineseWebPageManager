<template lang="html">
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>删除{{ item.type === 0 ? "文件夹" : "文件" }}</v-card-title>
      <v-card-text v-if="item.type === 0">
        确定要删除这个文件夹吗？文件夹内的所有文件都将被删除。
      </v-card-text>
      <v-card-text v-else>
        确定要删除这个文件吗？
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="deleteFile" color="primary">确定</v-btn>
        <v-btn variant="text" @click="dialog = false" color="primary">取消</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import notify from "@/notify";
import Path from "path-browserify";
import fileService from "@/services/fileService";

export default {
  props: {
    /**
     * File or folder
     * Folders are handled by the ServerQuery like files.
     * @type {TreeItem}
     */
    item: Object,
    modelValue: Boolean,
  },
  computed: {
    dialog: {
      get() {
        return this.modelValue;
      },
      set(val) {
        this.$emit("update:modelValue", val);
      },
    },
  },
  methods: {
    /**
     * Delete the file or folder.
     */
    async deleteFile() {
      let { cid, path, name } = this.item;

      try {
        await fileService.remove({
          channelId: cid,
          name: Path.join(path, name),
        });
      } catch (err) {
        notify.error(err.message);
      }

      this.$emit("filedelete", this.item);
    },
  },
};
</script>
