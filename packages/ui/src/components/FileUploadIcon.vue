<template lang="html">
  <v-menu offset-y :close-on-content-click="false" max-width="400">
    <template #activator="{ on }">
      <v-btn icon v-on="on">
        <v-badge :value="uploadQueue.length">
          <template #badge>
            <span>{{ uploadQueue.length }}</span>
          </template>
          <v-icon>mdi-upload</v-icon>
        </v-badge>
      </v-btn>
    </template>
    <v-card>
      <v-list>
        <v-list-item v-if="!uploadQueue.length">
          <v-list-item-content>
            <v-list-item-title>暂无上传任务</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item v-for="file in uploadQueue" :key="file.clientftfid">
          <v-list-item-avatar>
            <v-progress-circular :value="file.progress" color="primary">
            </v-progress-circular>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>{{ file.blob.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ file.filePath }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <div class="d-flex">
              <v-btn v-if="file.uploading" icon @click="pauseUpload()">
                <v-icon>mdi-pause</v-icon>
              </v-btn>
              <v-btn
                v-else
                icon
                :loading="loading"
                @click="startUploadLoop(file.clientftfid)"
                :disabled="$store.getters.uploading"
              >
                <v-icon>mdi-play</v-icon>
              </v-btn>

              <v-btn
                icon
                @click="removeUpload(file.clientftfid)"
                :disabled="file.uploading"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script>
import notify from "@/notify";
import fileService from "@/services/fileService";
import { ERROR_CODES } from "@/transport/transportError";

export default {
  data() {
    return {
      queueWatcher: undefined,
      currentTransferId: undefined,
      loading: false,
    };
  },
  computed: {
    uploadQueue() {
      return this.$store.state.uploads.queue;
    },
  },
  methods: {
    getFileInfo(cid, name, cpw = "") {
      return fileService.getInfo({ channelId: cid, name, channelPassword: cpw });
    },
    initFileUpload(file, overwrite = 1, resume = 0, cpw = "") {
      return fileService.initUpload({
        cid: file.cid,
        path: file.filePath,
        size: file.fileSize,
        cpw,
        overwrite,
        resume,
      });
    },
    watchQueue() {
      this.queueWatcher = this.$watch("$store.state.uploads.queue", () => {
        this.startUploadLoop();
      });
    },
    unwatchQueue() {
      this.queueWatcher();
    },
    getFileInQueue(clientftfid) {
      return this.uploadQueue.find((file) => file.clientftfid === clientftfid);
    },
    uploadFile(blob, clientftfid, ticket, sendedBytes = 0) {
      return fileService.upload({
        blob,
        ticket,
        transferId: clientftfid,
        sendedBytes,
        onProgress: (percentage) => {
          this.$store.commit("setFileUploadProgress", {
            clientftfid,
            percentage,
          });
        },
      });
    },
    async startUploadLoop(clientTransferId) {
      try {
        this.unwatchQueue();

        let clientftfid = clientTransferId
          ? clientTransferId
          : this.uploadQueue[0].clientftfid;
        let file = this.getFileInQueue(clientftfid);

        this.currentTransferId = clientftfid;
        file.uploading = true;

        if (file.progress) {
          let { ticket } = await this.initFileUpload(file, 0, 1);
          let { size } = await this.getFileInfo(file.cid, file.filePath);

          await this.uploadFile(
            file.blob.slice(size),
            clientftfid,
            ticket,
            size
          );
        } else {
          let { ticket } = await this.initFileUpload(file);

          await this.uploadFile(file.blob, clientftfid, ticket);
        }

        this.currentTransferId = undefined;
        this.$store.commit("removeFileFromQueue", clientftfid);

        if (!this.uploadQueue.length) {
          this.watchQueue();
        } else {
          this.startUploadLoop();
        }
      } catch (err) {
        this.handleUploadError(err);
      }
    },
    pauseUpload() {
      fileService.cancel(this.currentTransferId);

      this.loading = true;

      setTimeout(() => {
        this.loading = false;
      }, 5000);
    },
    removeUpload(clientftfid) {
      fileService.cancel(clientftfid);

      this.$store.commit("removeFileFromQueue", clientftfid);
    },
    handleUploadError(err) {
      // Hide error when upload got paused
      if (err.code !== ERROR_CODES.REQUEST_CANCELLED) {
        notify.error(err.message);
      }

      this.currentTransferId = undefined;
      this.$store.commit("resetUploadState");
    },
  },
  created() {
    this.watchQueue();
  },
  beforeDestroy() {
    if (this.currentTransferId !== undefined) {
      fileService.cancel(this.currentTransferId);
    }
  },
};
</script>
