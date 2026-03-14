<script setup lang="ts">
import FullTextSelect from './FullTextSelect.vue';

defineProps<{ label: string; value?: string | number }>();
</script>

<template>
  <div class="text-right text-gray-400">
    {{ label }}:
  </div>
  <FullTextSelect>
    <template v-if="value">
      {{ value }}
    </template>
    <div v-else class="text-gray-500 italic" v-text="'<Unspecified>'" />
  </FullTextSelect>
</template>
