<template>
  <div :style="{ width: '100%' }">
    <spacer-special
      v-if="specialSpacer"
      :characterBlock="text"
    ></spacer-special>
    <div v-else :style="{ textAlign }">
      {{ text }}
    </div>
  </div>
</template>

<script>
import SpacerSpecial from "@/components/SpacerSpecial";

export default {
  components: {
    SpacerSpecial,
  },
  props: {
    channelName: String,
  },
  data() {
    return {
      spacer: /^\[(.*)(spacer)(.*)\](.*)/,
      specialSpacer: false,
      characterBlocks: ["-..", "___", "-.-", "...", "---"],
      text: "",
      textAlign: "left",
    };
  },
  methods: {
    analyzeSpacer(name) {
      let disassembledSpacer = name.match(this.spacer);
      let alignment = disassembledSpacer[1];

      this.text = name.split(/](.*)/s)[1];

      if (this.characterBlocks.includes(this.text)) {
        this.specialSpacer = true;
      } else {
        this.specialSpacer = false;

        this.setTextAlignment(alignment);
      }
    },
    setTextAlignment(alignment) {
      // Only the first character is taken into account; everything else is ignored
      const alignments = { l: "left", c: "center", r: "right" };
      this.textAlign = alignments[alignment[0]] || "left";
    },
  },
  watch: {
    channelName: {
      immediate: true,
      handler(name) {
        this.analyzeSpacer(name);
      },
    },
  },
};
</script>

