<template lang="html">
  <v-list-item @click="$emit('click', channel)">

      <v-icon size="large">mdi-hexagon-slice-4</v-icon>

    <v-badge color="error" :model-value="!!badgeValue">
      <template #badge>
        {{ badgeValue }}
      </template>

        <v-list-item-title>{{ channel.channelName }}</v-list-item-title>
        <v-list-item-subtitle>{{ channel.cid }}</v-list-item-subtitle>

    </v-badge>
  </v-list-item>
</template>

<script>
export default {
  props: {
    badgeValue: {
      type: [Number, String],
      default: 0,
    },
    channel: Object,
  },
};
</script>
