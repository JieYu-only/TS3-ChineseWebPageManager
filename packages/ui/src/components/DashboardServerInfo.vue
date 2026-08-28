<template lang="html">
  <v-card>
    <v-card-title>{{ serverInfo.virtualserverName }}</v-card-title>
    <v-card-text>
      <v-list>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>IP 地址：</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            {{ serverInfo.virtualserverIp }}
          </v-list-item-action>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>版本：</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>{{
            serverInfo.virtualserverVersion
          }}</v-list-item-action>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>运行时间：</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>{{
            serverInfo.virtualserverUptime
          }}</v-list-item-action>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>平台：</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>{{
            serverInfo.virtualserverPlatform
          }}</v-list-item-action>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>累计下载流量：</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>{{
            serverInfo.virtualserverTotalBytesDownloaded
          }}</v-list-item-action>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>累计上传流量：</v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>{{
            serverInfo.virtualserverTotalBytesUploaded
          }}</v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  props: {
    serverInfo: {
      type: Object,
      default() {
        return {};
      },
    },
  },
};
</script>

<style lang="css" scoped></style>
