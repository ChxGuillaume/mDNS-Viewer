<script setup lang="ts">
import { useActions } from '@/composables/useActions';

const props = defineProps<{ value: string; label?: string; mono?: boolean }>();

const { copy } = useActions();
</script>

<template>
  <button
    type="button"
    class="group/copy flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 text-left transition-colors hover:bg-elevated"
    :class="{ 'font-mono text-[0.8125rem]': mono }"
    :title="`Copy ${props.label ?? 'value'}`"
    @click="copy(props.value, props.label)"
  >
    <span class="truncate selectable">
      <slot>{{ value }}</slot>
    </span>
    <UIcon name="i-lucide-copy" class="size-3.5 shrink-0 text-dimmed opacity-0 transition-opacity group-hover/copy:opacity-100" />
  </button>
</template>
