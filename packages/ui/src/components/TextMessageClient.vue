<template lang="html">
  <v-list-item @click="$emit('click', client)">

      <client-avatar :clientDbId="client.clientDatabaseId"> </client-avatar>

    <v-badge color="error" :model-value="!!badgeValue">
      <template #badge>
        {{ badgeValue }}
      </template>

        <v-list-item-title>
          {{ client.clientNickname }} <v-icon>{{ statusIcon }}</v-icon>
        </v-list-item-title>

    </v-badge>
  </v-list-item>
</template>

<script>
import { defineAsyncComponent } from "vue";

export default {
  components: {
    ClientAvatar: defineAsyncComponent(() => import("@/components/ClientAvatar")),
  },
  props: {
    client: Object,
    badgeValue: {
      type: [String, Number],
      default: 0,
    },
  },
  computed: {
    statusIcon() {
      if (this.client.clientAway) {
        return "mdi-account-clock-outline";
      } else if (this.client.clientOutputMuted) {
        return "mdi-volume-off";
      } else if (this.client.clientInputMuted) {
        return "mdi-microphone-off";
      }
    },
  },
};
</script>
