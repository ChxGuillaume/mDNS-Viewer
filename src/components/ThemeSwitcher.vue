<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { useColorMode } from '@vueuse/core';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left' }>(), { side: 'top' });

type Mode = 'auto' | 'light' | 'dark';

const { store } = useColorMode();

const modes: { value: Mode; label: string; icon: string }[] = [
  { value: 'auto', label: 'System', icon: 'i-lucide-monitor' },
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
];

const current = computed(() => modes.find(mode => mode.value === store.value) ?? modes[0]!);

const items = computed<DropdownMenuItem[][]>(() => [
  [{ label: 'Appearance', type: 'label' }],
  modes.map(mode => ({
    label: mode.label,
    icon: mode.icon,
    type: 'checkbox' as const,
    checked: store.value === mode.value,
    onSelect: () => {
      store.value = mode.value;
    },
  })),
]);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ side, align: side === 'right' ? 'end' : 'center', sideOffset: 8 }" :ui="{ content: 'w-40' }">
    <UTooltip :text="`Theme: ${current.label}`" :content="{ side }">
      <UButton
        :icon="current.icon"
        color="neutral"
        variant="ghost"
        :aria-label="`Theme: ${current.label}`"
        v-bind="$attrs"
      />
    </UTooltip>
  </UDropdownMenu>
</template>
