<script setup lang="ts">
import { useActions } from '@/composables/useActions';

const props = defineProps<{ value: string; label?: string; mono?: boolean; wrap?: boolean }>();

const { copy } = useActions();
</script>

<template>
  <button
    type="button"
    class="group/copy -mx-1.5 flex max-w-[calc(100%+0.75rem)] min-w-0 items-start gap-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-elevated"
    :class="{ 'font-mono text-[0.8125rem]': mono }"
    :title="`Copy ${props.label ?? 'value'}`"
    @click="copy(props.value, props.label)"
  >
    <span class="min-w-0 selectable" :class="wrap ? 'wrap-anywhere whitespace-pre-wrap' : 'truncate'">
      <slot>{{ value }}</slot>
    </span>
    <UIcon name="i-lucide-copy" class="mt-0.5 size-3.5 shrink-0 text-dimmed opacity-0 transition-opacity group-hover/copy:opacity-100" />
  </button>
</template>
