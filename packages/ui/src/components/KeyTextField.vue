<template>
  <v-text-field
    class="mt-5"
    :label="label"
    :value="value"
    @input="$emit('input', $event)"
    readonly
    outlined
  >
    <template #append v-if="value">
      <v-tooltip bottom>
        <template #activator="{ on }">
          <v-icon v-on="on" @click="copyToClipboard">mdi-content-copy</v-icon>
        </template>
        <span>复制到剪贴板</span>
      </v-tooltip>
    </template>
  </v-text-field>
</template>

<script>
import copyToClipboard from "@/utils/clipboard";

export default {
  props: {
    value: String,
    label: String,
  },
  methods: {
    copyToClipboard() {
      copyToClipboard(this.value);

      this.$toast.info("已复制到剪贴板");
    },
  },
};
</script>
