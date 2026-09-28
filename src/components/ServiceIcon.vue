<script setup lang="ts">
withDefaults(defineProps<{ icon: string; tile: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' });
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center ring-1 ring-inset"
    :class="[tile, {
      'size-7 rounded-md': size === 'sm',
      'size-9 rounded-lg': size === 'md',
      'size-12 rounded-xl': size === 'lg',
    }]"
  >
    <UIcon
      :name="icon"
      :class="{ 'size-3.5': size === 'sm', 'size-4.5': size === 'md', 'size-6': size === 'lg' }"
    />
  </span>
</template>
