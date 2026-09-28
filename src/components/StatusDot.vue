<script setup lang="ts">
defineProps<{ online: boolean; pulse?: boolean }>();
</script>

<template>
  <span class="relative inline-flex size-2 shrink-0">
    <span v-if="online && pulse" class="absolute inset-0 animate-ping-slow rounded-full bg-emerald-500" />
    <span class="relative inline-flex size-2 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'" />
  </span>
</template>
