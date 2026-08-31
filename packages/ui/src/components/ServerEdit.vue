<template lang="html">
  <v-container>
    <v-layout justify-center>
      <v-flex lg6 md8 sm8 xs12>
        <v-card>
          <v-card-title>管理虚拟服务器</v-card-title>
          <v-card-text>
            <v-text-field
              label="服务器名称"
              v-model="serverInfo.virtualserverName"
              :disabled="$store.state.query.loading"
            ></v-text-field>
            <v-text-field
              label="服务器密码"
              v-model="serverInfo.virtualserverPassword"
              :disabled="$store.state.query.loading"
              type="password"
            ></v-text-field>
            <v-layout justify-space-between>
              <v-flex xs5>
                <v-text-field
                  label="最大用户数"
                  v-model="serverInfo.virtualserverMaxclients"
                  :disabled="$store.state.query.loading"
                  type="number"
                ></v-text-field>
              </v-flex>
              <v-flex xs5>
                <v-text-field
                  label="预留席位数"
                  v-model="serverInfo.virtualserverReservedSlots"
                  :disabled="$store.state.query.loading"
                  type="number"
                ></v-text-field>
              </v-flex>
            </v-layout>
            <v-textarea
              label="欢迎消息"
              v-model="serverInfo.virtualserverWelcomemessage"
              :disabled="$store.state.query.loading"
            ></v-textarea>

            <v-expansion-panels accordion flat>
              <v-expansion-panel>
                <v-expansion-panel-header>主机信息</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-card outlined>
                    <v-card-subtitle>主机消息</v-card-subtitle>
                    <v-card-text>
                      <v-text-field
                        label="消息内容"
                        v-model="serverInfo.virtualserverHostmessage"
                        :disabled="$store.state.query.loading"
                      ></v-text-field>
                      <v-select
                        label="消息显示方式"
                        v-model="serverInfo.virtualserverHostmessageMode"
                        :items="messageModes"
                      ></v-select>
                    </v-card-text>
                  </v-card>
                  <v-card class="mt-2" outlined>
                    <v-card-subtitle>主机横幅</v-card-subtitle>
                    <v-card-text>
                      <v-text-field
                        label="横幅图片 URL"
                        v-model="serverInfo.virtualserverHostbannerGfxUrl"
                        :disabled="$store.state.query.loading"
                      ></v-text-field>
                      <v-text-field
                        label="链接 URL"
                        v-model="serverInfo.virtualserverHostbannerUrl"
                        :disabled="$store.state.query.loading"
                      ></v-text-field>
                      <v-layout justify-space-between>
                        <v-flex xs4>
                          <v-text-field
                            label="图片切换间隔"
                            v-model="
                              serverInfo.virtualserverHostbannerGfxInterval
                            "
                            type="number"
                            :disabled="$store.state.query.loading"
                          ></v-text-field>
                        </v-flex>
                        <v-flex xs6>
                          <v-select
                            label="缩放方式"
                            :items="bannerModes"
                            v-model="serverInfo.virtualserverHostbannerMode"
                          ></v-select>
                        </v-flex>
                      </v-layout>
                    </v-card-text>
                  </v-card>
                  <v-card class="my-2" outlined>
                    <v-card-subtitle>主机按钮</v-card-subtitle>
                    <v-card-text>
                      <v-text-field
                        label="提示文字"
                        v-model="serverInfo.virtualserverHostbuttonTooltip"
                        :disabled="$store.state.query.loading"
                      ></v-text-field>
                      <v-text-field
                        label="链接 URL"
                        v-model="serverInfo.virtualserverHostbuttonUrl"
                        :disabled="$store.state.query.loading"
                      ></v-text-field>
                      <v-text-field
                        label="图标 URL"
                        v-model="serverInfo.virtualserverHostbuttonGfxUrl"
                        :disabled="$store.state.query.loading"
                      ></v-text-field>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-header>文件传输</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-card outlined>
                    <v-card-subtitle>上传</v-card-subtitle>
                    <v-card-text>
                      <v-text-field
                        label="带宽限制"
                        v-model="
                          serverInfo.virtualserverMaxUploadTotalBandwidth
                        "
                        :disabled="$store.state.query.loading"
                        type="number"
                      >
                        <template #append>
                          <div>Byte/s</div>
                        </template>
                      </v-text-field>
                      <v-text-field
                        label="上传配额"
                        v-model="serverInfo.virtualserverUploadQuota"
                        :disabled="$store.state.query.loading"
                        type="number"
                      >
                        <template #append>
                          <div>MiB</div>
                        </template>
                      </v-text-field>
                    </v-card-text>
                  </v-card>
                  <v-card class="my-2" outlined>
                    <v-card-subtitle>下载</v-card-subtitle>
                    <v-card-text>
                      <v-text-field
                        label="带宽限制"
                        v-model="
                          serverInfo.virtualserverMaxDownloadTotalBandwidth
                        "
                        :disabled="$store.state.query.loading"
                        type="number"
                      >
                        <template #append>
                          <div>Byte/s</div>
                        </template>
                      </v-text-field>
                      <v-text-field
                        label="下载配额"
                        v-model="serverInfo.virtualserverDownloadQuota"
                        :disabled="$store.state.query.loading"
                        type="number"
                      >
                        <template #append>
                          <div>MiB</div>
                        </template>
                      </v-text-field>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-header>
                  Anti-Flood
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-card class="mb-2" outlined>
                    <v-card-text>
                      <v-text-field
                        label="每周期减少的防洪积分"
                        v-model="
                          serverInfo.virtualserverAntifloodPointsTickReduce
                        "
                        :disabled="$store.state.query.loading"
                        type="number"
                      ></v-text-field>
                      <v-text-field
                        label="阻止命令所需积分"
                        v-model="
                          serverInfo.virtualserverAntifloodPointsNeededCommand_block
                        "
                        :disabled="$store.state.query.loading"
                        type="number"
                      ></v-text-field>
                      <v-text-field
                        label="封锁 IP 所需积分"
                        v-model="
                          serverInfo.virtualserverAntifloodPointsNeededIp_block
                        "
                        :disabled="$store.state.query.loading"
                        type="number"
                      ></v-text-field>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-header>安全设置</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-card class="mb-2" outlined>
                    <v-card-text>
                      <v-text-field
                        label="所需安全等级"
                        v-model="
                          serverInfo.virtualserverNeededIdentitySecurityLevel
                        "
                        :disabled="$store.state.query.loading"
                        type="number"
                      ></v-text-field>
                      <v-select
                        label="频道语音数据加密"
                        v-model="serverInfo.virtualserverCodecEncryptionMode"
                        :items="encryptionModes"
                      ></v-select>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-header>其他设置</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-card outlined>
                    <v-card-subtitle>默认用户组</v-card-subtitle>
                    <v-card-text>
                      <v-autocomplete
                        :items="serverGroups"
                        item-text="name"
                        item-value="sgid"
                        v-model="serverInfo.virtualserverDefaultServerGroup"
                        label="服务器组"
                        :disabled="$store.state.query.loading"
                      >
                        <template #selection="{ item }">
                          <div>{{ item.name }} ({{ item.sgid }})</div>
                        </template>
                        <template #item="{ item }">
                          <div>{{ item.name }} ({{ item.sgid }})</div>
                        </template>
                      </v-autocomplete>
                      <v-autocomplete
                        :items="channelGroups"
                        item-text="name"
                        item-value="cgid"
                        v-model="serverInfo.virtualserverDefaultChannelGroup"
                        label="频道组"
                        :disabled="$store.state.query.loading"
                      >
                        <template #selection="{ item }">
                          <div>{{ item.name }} ({{ item.cgid }})</div>
                        </template>
                        <template #item="{ item }">
                          <div>{{ item.name }} ({{ item.cgid }})</div>
                        </template>
                      </v-autocomplete>
                      <v-autocomplete
                        :items="channelGroups"
                        item-text="name"
                        item-value="cgid"
                        v-model="
                          serverInfo.virtualserverDefaultChannelAdminGroup
                        "
                        label="频道管理员组"
                        :disabled="$store.state.query.loading"
                      >
                        <template #selection="{ item }">
                          <div>{{ item.name }} ({{ item.cgid }})</div>
                        </template>
                        <template #item="{ item }">
                          <div>{{ item.name }} ({{ item.cgid }})</div>
                        </template>
                      </v-autocomplete>
                    </v-card-text>
                  </v-card>
                  <v-card class="mt-2" outlined>
                    <v-card-subtitle>投诉与自动封禁</v-card-subtitle>
                    <v-card-text>
                      <v-layout justify-space-between wrap>
                        <v-flex xs5 md3>
                          <v-text-field
                            label="触发自动封禁的投诉次数"
                            :disabled="$store.state.query.loading"
                            v-model="
                              serverInfo.virtualserverComplainAutobanCount
                            "
                            type="number"
                          ></v-text-field>
                        </v-flex>
                        <v-flex xs5 md3>
                          <v-text-field
                            label="自动封禁时长"
                            :disabled="$store.state.query.loading"
                            v-model="
                              serverInfo.virtualserverComplainAutobanTime
                            "
                            type="number"
                          >
                            <template #append>
                              <div>秒</div>
                            </template>
                          </v-text-field>
                        </v-flex>
                        <v-flex xs5 md3>
                          <v-text-field
                            label="投诉记录移除时间"
                            :disabled="$store.state.query.loading"
                            v-model="
                              serverInfo.virtualserverComplainRemoveTime
                            "
                            type="number"
                          >
                            <template #append>
                              <div>秒</div>
                            </template>
                          </v-text-field>
                        </v-flex>
                      </v-layout>
                    </v-card-text>
                  </v-card>
                  <v-card class="my-2" outlined>
                    <v-card-text>
                      <v-text-field
                        label="启用静音前频道最少用户数"
                        :disabled="$store.state.query.loading"
                        v-model="
                          serverInfo.virtualserverMinClientsInChannel_beforeForcedSilence
                        "
                        type="number"
                      ></v-text-field>
                      <v-text-field
                        label="优先发言者音量衰减系数"
                        :disabled="$store.state.query.loading"
                        v-model="
                          serverInfo.virtualserverPrioritySpeakerDimmModificator
                        "
                        type="number"
                      ></v-text-field>
                      <v-text-field
                        label="临时频道删除延迟"
                        :disabled="$store.state.query.loading"
                        v-model="
                          serverInfo.virtualserverChannelTempDeleteDelay_default
                        "
                        type="number"
                      ></v-text-field>
                      <v-text-field
                        label="语音名称"
                        :disabled="$store.state.query.loading"
                        v-model="serverInfo.virtualserverNamePhonetic"
                      ></v-text-field>
                      <v-checkbox
                        label="允许上报到公开服务器列表"
                        v-model="weblistEnabled"
                      ></v-checkbox>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-header>日志设置</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-card class="mb-2" outlined>
                    <v-card-subtitle>启用以下日志</v-card-subtitle>
                    <v-card-text>
                      <v-checkbox
                        label="用户"
                        v-model="logClient"
                      ></v-checkbox>
                      <v-checkbox
                        label="频道"
                        v-model="logChannel"
                      ></v-checkbox>
                      <v-checkbox
                        label="服务器"
                        v-model="logServer"
                      ></v-checkbox>
                      <v-checkbox
                        label="ServerQuery"
                        v-model="logQuery"
                      ></v-checkbox>
                      <v-checkbox
                        label="权限"
                        v-model="logPermissions"
                      ></v-checkbox>
                      <v-checkbox
                        label="文件传输"
                        v-model="logFileTransfer"
                      ></v-checkbox>
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              :disabled="this.$store.state.query.loading"
              color="primary"
              @click="saveChanges"
              >OK
            </v-btn>
            <v-btn text @click="$router.go(-1)" color="primary">取消</v-btn>
            <v-btn
              text
              :disabled="this.$store.state.query.loading"
              color="primary"
              @click="applyChanges"
              >Apply
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import notify from "@/notify";
import groupService from "@/services/groupService";
import serverService from "@/services/serverService";
export default {
  data() {
    return {
      serverInfo: {},
      serverInfoCopy: {},
      messageModes: [
        { text: "不显示消息", value: 0 },
        { text: "在日志中显示", value: 1 },
        { text: "弹窗显示", value: 2 },
        { text: "弹窗显示并退出", value: 3 },
      ],
      bannerModes: [
        { text: "不调整", value: 0 },
        { text: "调整并忽略宽高比", value: 1 },
        { text: "按宽高比调整", value: 2 },
      ],
      encryptionModes: [
        { text: "按频道配置", value: 0 },
        { text: "全局关闭", value: 1 },
        { text: "全局开启", value: 2 },
      ],
      serverGroups: [],
      channelGroups: [],
    };
  },
  computed: {
    weblistEnabled: {
      get() {
        return this.serverInfo.virtualserverWeblistEnabled ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverWeblistEnabled = bool ? 1 : 0;
      },
    },
    logClient: {
      get() {
        return this.serverInfo.virtualserverLogClient ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverLogClient = bool ? 1 : 0;
      },
    },
    logQuery: {
      get() {
        return this.serverInfo.virtualserverLogQuery ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverLogQuery = bool ? 1 : 0;
      },
    },
    logChannel: {
      get() {
        return this.serverInfo.virtualserverLogChannel ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverLogChannel = bool ? 1 : 0;
      },
    },
    logPermissions: {
      get() {
        return this.serverInfo.virtualserverLogPermissions ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverLogPermissions = bool ? 1 : 0;
      },
    },
    logServer: {
      get() {
        return this.serverInfo.virtualserverLogServer ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverLogServer = bool ? 1 : 0;
      },
    },
    logFileTransfer: {
      get() {
        return this.serverInfo.virtualserverLogFiletransfer ? true : false;
      },
      set(bool) {
        this.serverInfo.virtualserverLogFiletransfer = bool ? 1 : 0;
      },
    },
  },
  methods: {
    getServerInfo() {
      return serverService.info();
    },
    async getServerGroupList() {
      const groups = await groupService.listServerGroups();
      return groups.filter((group) => group.type === 1);
    },
    async getChannelGroupList() {
      const groups = await groupService.listChannelGroups();
      return groups.filter((group) => group.type === 1);
    },
    getChanges() {
      let changes = {};

      for (let prop in this.serverInfo) {
        if (this.serverInfo[prop] !== this.serverInfoCopy[prop]) {
          changes[prop] = this.serverInfo[prop];
        }
      }

      return changes;
    },
    serverEdit() {
      return serverService.changeName(this.getChanges());
    },
    async saveChanges() {
      try {
        await this.serverEdit();

        this.$router.go(-1);
      } catch (err) {
        notify.error(err.message);
      }
    },
    async applyChanges() {
      try {
        await this.serverEdit();
      } catch (err) {
        notify.error(err.message);
      }

      this.init();
    },
    async init() {
      try {
        this.serverInfo = await this.getServerInfo();
        this.serverInfoCopy = { ...this.serverInfo };
        this.serverGroups = await this.getServerGroupList();
        this.channelGroups = await this.getChannelGroupList();
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
  created() {
    this.init();
  },
};
</script>
