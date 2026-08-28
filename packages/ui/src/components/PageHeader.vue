<template>
  <header class="page-header">
    <nav class="page-breadcrumb" aria-label="面包屑">
      <v-icon small>mdi-home</v-icon>
      <template v-for="(crumb, index) in crumbs">
        <v-icon
          v-if="index > 0"
          :key="'sep-' + index"
          x-small
          class="breadcrumb-sep"
        >
          mdi-chevron-right
        </v-icon>
        <component
          :is="index === crumbs.length - 1 ? 'strong' : 'span'"
          :key="'crumb-' + index"
          :class="{ 'breadcrumb-current': index === crumbs.length - 1 }"
        >
          {{ crumb }}
        </component>
      </template>
    </nav>

    <div class="page-title-row">
      <div class="page-title">
        <h1>{{ title }}</h1>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: "PageHeader",
  props: {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    breadcrumbs: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    crumbs() {
      return this.breadcrumbs && this.breadcrumbs.length
        ? this.breadcrumbs
        : ["控制台", this.title];
    },
  },
};
</script>

<style scoped>
.page-header {
  width: 100%;
}

.page-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 18px;
  color: #9099a8;
  font-size: 12px;
  line-height: 1.4;
}

.page-breadcrumb strong {
  color: #4b5668;
  font-weight: 500;
}

.page-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.page-title h1 {
  margin: 0;
  color: #19253b;
  font-size: 23px;
  line-height: 1.3;
  letter-spacing: -0.3px;
}

.page-title p {
  margin: 4px 0 0;
  color: #929cab;
  font-size: 12px;
  line-height: 1.6;
}

.page-actions {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .page-breadcrumb {
    margin-bottom: 14px;
  }

  .page-title-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .page-title h1 {
    font-size: 21px;
  }

  .page-title p {
    font-size: 13px;
  }

  .page-actions {
    width: 100%;
  }
}
</style>
