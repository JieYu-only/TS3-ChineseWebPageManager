<template lang="html">
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title>重命名{{ item.type === 0 ? "文件夹" : "文件" }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="newFileName"
          :label="item.type === 0 ? '文件夹名称' : '文件名称'"
        ></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          text
          @click="renameFile"
          color="primary"
          :disabled="newFileName === item.name"
          >确定</v-btn
        >
        <v-btn text @click="dialog = false" color="primary">取消</v-btn>
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
    value: Boolean,
  },
  data() {
    return {
      newFileName: "",
    };
  },
  computed: {
    dialog: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit("input", val);
      },
    },
  },
  methods: {
    /**
     * Rename the file or folder.
     */
    async renameFile() {
      let { cid, path, name } = this.item;

      try {
        await fileService.rename({
          channelId: cid,
          oldName: Path.join(path, name),
          newName: Path.join(path, this.newFileName),
        });
      } catch (err) {
        notify.error(err.message);
      }

      this.$emit("filerename", this.item);
    },
  },
  watch: {
    dialog(open) {
      if (open) {
        this.newFileName = this.item.name;
      }
    },
  },
};
</script>
