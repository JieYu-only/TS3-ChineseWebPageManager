<template lang="html">
  <v-container>
    <v-row justify="center">
      <v-col cols="12" lg="6" md="8" sm="10">
        <v-card>
          <v-card-title>上传文件</v-card-title>
          <v-card-text>
            <v-file-input
              label="选择一个或多个文件"
              v-model="files"
              multiple
            ></v-file-input>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="addFilesToUploadQueue" :disabled="!files.length"
              >加入上传队列</v-btn
            >
            <v-btn text @click="close">取消</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import fileTransfer from "@/mixins/fileTransfer";

export default {
  mixins: [fileTransfer],
  data() {
    return {
      path: this.$route.query.path ? this.$route.query.path : "/",
      channelId: this.$route.params.cid,
      files: [],
    };
  },
  methods: {
    async addFilesToUploadQueue() {
      try {
        for (let file of this.files) {
          this.$store.commit("addFileToQueue", {
            clientftfid: this.getClientFileTransferId(),
            cid: this.channelId,
            filePath: this.getFilePath(this.path, file.name),
            blob: file,
            progress: 0,
            fileSize: file.size,
            uploading: false,
          });
        }
      } catch (err) {
        this.$toast.error(err.message);
      }

      this.$router.push({ name: "files" });
    },
    close() {
      this.$router.push({ name: "files" });
    },
  },
};
</script>
