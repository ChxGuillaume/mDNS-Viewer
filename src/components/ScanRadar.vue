<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 120 });
</script>

<template>
  <div class="relative" :style="{ width: `${size}px`, height: `${size}px` }">
    <div class="absolute inset-0 rounded-full border border-primary/20" />
    <div class="absolute inset-[18%] rounded-full border border-primary/25" />
    <div class="absolute inset-[36%] rounded-full border border-primary/30" />
    <div
      class="absolute inset-0 animate-sweep rounded-full"
      style="background: conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--ui-primary) 35%, transparent) 60deg, transparent 61deg)"
    />
    <div class="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full bg-primary shadow-[0_0_12px] shadow-primary" />
  </div>
</template>
