<template>
  <v-text-field
    class="mt-5"
    :label="label"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    readonly
    variant="outlined"
  >
    <template #append v-if="modelValue">
      <v-tooltip location="bottom">
        <template #activator="{ props }">
          <v-icon v-bind="props" @click="copyToClipboard">mdi-content-copy</v-icon>
        </template>
        <span>复制到剪贴板</span>
      </v-tooltip>
    </template>
  </v-text-field>
</template>

<script>
import notify from "@/notify";
import copyToClipboard from "@/utils/clipboard";

export default {
  props: {
    modelValue: String,
    label: String,
  },
  methods: {
    copyToClipboard() {
      copyToClipboard(this.modelValue).then((ok) => {
        if (ok) notify.info("已复制到剪贴板");
        else notify.error("复制失败，请手动复制");
      });
    },
  },
};
</script>
