<template>
  <v-container>
    <v-layout justify-center>
      <v-flex lg6 md8 sm8 xs12>
        <v-card>
          <v-card-title>创建权限密钥</v-card-title>
          <v-card-text>
            <v-select
              :items="tokenTypes"
              label="密钥类型"
              v-model="selectedType"
              :disabled="$store.state.query.loading"
            ></v-select>
            <v-autocomplete
              :items="availableGroups"
              label="用户组"
              v-model="selectedGroup"
              :disabled="
                typeof selectedType === 'undefined' ||
                $store.state.query.loading
              "
            ></v-autocomplete>
            <v-autocomplete
              :items="availableChannels"
              label="频道"
              v-model="selectedChannel"
              :disabled="
                selectedType === 0 ||
                typeof selectedType === 'undefined' ||
                $store.state.query.loading
              "
            ></v-autocomplete>
            <v-textarea
              label="描述"
              v-model="tokenDescription"
            ></v-textarea>
            <key-text-field
              v-model="token"
              label="生成的权限密钥"
            ></key-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              text
              @click="createToken"
              color="primary"
              :disabled="typeof selectedType === 'undefined'"
              >创建</v-btn
            >
            <v-btn text @click="$router.go(-1)" color="primary">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import notify from "@/notify";
import copyToClipboard from "@/utils/clipboard";
import channelService from "@/services/channelService";
import groupService from "@/services/groupService";
import tokenService from "@/services/tokenService";

export default {
  components: {
    KeyTextField: () => import("@/components/KeyTextField"),
  },
  data() {
    return {
      token: undefined,
      tokenTypes: [
        { text: "服务器组", value: 0 },
        { text: "频道组", value: 1 },
      ],
      selectedType: undefined,
      selectedGroup: undefined,
      selectedChannel: undefined,
      tokenDescription: "",
      groups: [],
      channels: [],
    };
  },
  computed: {
    availableGroups() {
      return this.groups.map((group) => {
        return {
          text: group.name,
          value: group.sgid || group.cgid,
        };
      });
    },
    availableChannels() {
      return this.channels.map((channel) => {
        return {
          text: channel.channelName,
          value: channel.cid,
        };
      });
    },
  },
  methods: {
    copyToClipboard() {
      copyToClipboard(this.token).then((ok) => {
        if (ok) notify.info("权限密钥已复制到剪贴板");
        else notify.error("复制失败，请手动复制");
      });
    },
    async createToken() {
      try {
        let [response] = await tokenService.create({
          tokenType: this.selectedType,
          groupId: this.selectedGroup,
          channelId:
            this.selectedType === 1 ? this.selectedChannel : undefined,
          description: this.tokenDescription,
        });

        notify.success("权限密钥创建成功");

        this.token = response.token;
      } catch (err) {
        notify.error(err.message);
      }
    },
    async getServerGroupList() {
      const groups = await groupService.listServerGroups();
      return groups.filter((group) => group.type === 1);
    },
    async getChannelGroupList() {
      const groups = await groupService.listChannelGroups();
      return groups.filter((group) => group.type === 1);
    },
    getChannelList() {
      return channelService.list();
    },
  },
  watch: {
    async selectedType(tokenType) {
      try {
        if (tokenType === 0) {
          this.groups = await this.getServerGroupList();

          this.selectedGroup = this.groups[0].sgid;
        }
        if (tokenType === 1) {
          this.groups = await this.getChannelGroupList();
          this.channels = await this.getChannelList();

          this.selectedGroup = this.groups[0].cgid;
          this.selectedChannel = this.channels[0].cid;
        }
      } catch (err) {
        notify.error(err.message);
      }
    },
  },
};
</script>
