<template>
  <v-container fluid class="console-page">
    <div class="page-breadcrumb"><v-icon small>mdi-home</v-icon><span>控制台</span><v-icon x-small>mdi-chevron-right</v-icon><strong>快照</strong></div>
    <div class="page-title-row"><h1>服务器快照</h1><p>下载完整配置备份，或从本地快照恢复服务器</p></div>
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="snapshot-card" elevation="0">
          <div class="card-icon download"><v-icon>mdi-cloud-download-outline</v-icon></div>
          <div class="card-content"><h2>创建快照</h2><p>导出当前虚拟服务器的频道、权限和配置，生成可下载的 <code>.backup</code> 文件。</p><v-btn color="primary" elevation="0" :loading="creating" @click="createSnapshot"><v-icon left small>mdi-download</v-icon>创建并下载</v-btn></div>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="snapshot-card danger-card" elevation="0">
          <div class="card-icon restore"><v-icon>mdi-backup-restore</v-icon></div>
          <div class="card-content"><h2>恢复快照</h2><p>恢复会覆盖当前服务器配置。请确认文件来自可信来源，并建议先下载当前快照。</p>
            <input ref="hiddenFileSelector" type="file" class="hidden-input" accept=".backup" @change="readFile" />
            <div class="file-picker" @click="selectFile"><v-icon small>mdi-paperclip</v-icon><span>{{ fileName || '选择 .backup 快照文件' }}</span><v-btn text small color="primary">浏览</v-btn></div>
            <v-btn color="error" elevation="0" :disabled="!fileName" :loading="restoring" @click="restoreDialog = true"><v-icon left small>mdi-upload</v-icon>恢复服务器</v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-alert text dense type="info" class="mt-4">快照包含服务器配置数据，但不包含 TeamSpeak 服务端程序和外部文件。</v-alert>
    <v-dialog v-model="restoreDialog" max-width="480">
      <v-card><v-card-title>确认恢复快照</v-card-title><v-card-text>该操作会覆盖当前服务器的频道和权限配置。确定使用“{{ fileName }}”继续吗？</v-card-text><v-card-actions><v-spacer /><v-btn text @click="restoreDialog=false">取消</v-btn><v-btn color="error" elevation="0" @click="deploySnapshot">确认恢复</v-btn></v-card-actions></v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import notify from "@/notify";
import { saveAs } from "file-saver";
import serverService from "@/services/serverService";
export default {
  data() { return { fileName: "", fileContent: {}, creating: false, restoring: false, restoreDialog: false }; },
  methods: {
    async createSnapshot() {
      this.creating = true;
      try { const response = await this.$TeamSpeak.createSnapshot(); saveAs(new Blob([response[0].data]), `${new Date().toISOString().replace(/[:]/g, "-")}.backup`); notify.success("快照已创建"); }
      catch (err) { notify.error(err.message); }
      this.creating = false;
    },
    selectFile() { this.$refs.hiddenFileSelector.click(); },
    async readFile(e) {
      const file = e.target.files[0]; if (!file) return;
      this.fileName = file.name;
      try { this.fileContent = new Blob([await file.text()]); } catch (err) { notify.error(err.message); this.clearFileSelector(); }
    },
    async deploySnapshot() {
      this.restoreDialog = false; this.restoring = true;
      try { await this.$TeamSpeak.deploySnapshot(this.fileContent); await serverService.select(this.$store.state.query.serverId); notify.success("快照恢复成功"); this.clearFileSelector(); }
      catch (err) { notify.error(err.message); }
      this.restoring = false;
    },
    clearFileSelector() { this.fileName = ""; this.fileContent = {}; this.$refs.hiddenFileSelector.value = ""; },
  },
};
</script>

<style scoped>
.console-page{max-width:1440px;padding:22px 30px 50px}.page-breadcrumb{display:flex;align-items:center;gap:7px;margin-bottom:18px;color:#9099a8;font-size:12px}.page-breadcrumb strong{color:#4b5668;font-weight:500}.page-title-row{margin-bottom:18px}.page-title-row h1{margin:0;color:#19253b;font-size:23px}.page-title-row p{margin:4px 0 0;color:#929cab;font-size:12px}.snapshot-card{display:flex;min-height:245px;padding:28px}.card-icon{display:flex;align-items:center;justify-content:center;flex:0 0 52px;width:52px;height:52px;margin-right:20px;border-radius:10px}.card-icon .v-icon{font-size:27px}.card-icon.download{background:#eef0ff}.card-icon.download .v-icon{color:#6268df}.card-icon.restore{background:#fff0f0}.card-icon.restore .v-icon{color:#e75d66}.card-content{flex:1}.card-content h2{margin:4px 0 9px;color:#202b40;font-size:18px}.card-content p{min-height:58px;margin:0 0 19px;color:#7c8798;font-size:13px;line-height:1.7}.hidden-input{display:none}.file-picker{display:flex;align-items:center;gap:8px;height:42px;margin:-5px 0 14px;padding:0 4px 0 12px;border:1px solid #dce1e8;border-radius:6px;cursor:pointer}.file-picker span{flex:1;min-width:0;overflow:hidden;color:#788395;font-size:12px;text-overflow:ellipsis;white-space:nowrap}@media(max-width:600px){.console-page{padding:16px}.snapshot-card{padding:22px 18px}.card-icon{display:none}}
</style>
