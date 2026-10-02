<script setup lang="ts">
import type { FilterKind, FilterTag } from '@/composables/useServiceBrowser';
import { computed, ref, useTemplateRef } from 'vue';

const props = defineProps<{
  options: Record<FilterKind, FilterTag[]>;
}>();

const tags = defineModel<FilterTag[]>('tags', { required: true });
const search = defineModel<string>('search', { required: true });

const MAX_PER_KIND = 8;

const groups: { kind: FilterKind; label: string }[] = [
  { kind: 'host', label: 'Hosts' },
  { kind: 'ip', label: 'IP addresses' },
  { kind: 'type', label: 'Service types' },
];

const suggestions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term)
    return [];
  const selected = new Set(tags.value.map(tag => tag.id));
  return groups
    .map(({ kind, label }) => {
      const matches = props.options[kind]
        .filter(tag => !selected.has(tag.id)
          && [tag.value, tag.label, tag.description].some(text => text?.toLowerCase().includes(term)))
        .slice(0, MAX_PER_KIND);
      return matches.length ? [{ type: 'label' as const, label }, ...matches] : [];
    })
    .filter(group => group.length);
});

const menuOpen = ref(false);
const open = computed(() => menuOpen.value && suggestions.value.length > 0);

const inputMenu = useTemplateRef('inputMenu');

function clear() {
  search.value = '';
  tags.value = [];
}

defineExpose({
  focus: () => inputMenu.value?.inputRef?.focus(),
});
</script>

<template>
  <UInputMenu
    ref="inputMenu"
    v-model="tags"
    v-model:search-term="search"
    :open="open"
    multiple
    ignore-filter
    by="id"
    :items="suggestions"
    :reset-search-term-on-blur="false"
    icon="i-lucide-search"
    :trailing-icon="false"
    placeholder="Search, or pick a host, IP or type…"
    size="sm"
    autocomplete="off"
    spellcheck="false"
    :ui="{
      root: 'flex-nowrap overflow-hidden',
      content: 'min-w-72 max-h-[min(26rem,var(--reka-combobox-content-available-height,26rem))]',
      tagsItem: 'shrink-0 max-w-40 font-mono data-[state=active]:ring-2',
      tagsInput: 'min-w-16',
      trailing: 'pe-1.5',
    }"
    @update:open="menuOpen = $event"
  >
    <template #tags-item-text="{ item }">
      <span v-if="'kind' in item" class="inline-flex min-w-0 items-center gap-1" :title="`${item.kind}: ${item.value}`">
        <UIcon :name="item.icon" class="size-3 shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </span>
    </template>

    <template #item-leading="{ item }">
      <span
        v-if="typeof item === 'object' && 'kind' in item"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded ring-1 ring-inset"
        :class="item.tile"
      >
        <UIcon :name="item.icon" class="size-3" />
      </span>
    </template>

    <template #trailing>
      <UButton
        v-if="search || tags.length"
        as="span"
        icon="i-lucide-x"
        color="neutral"
        variant="link"
        size="xs"
        aria-label="Clear search and filters"
        @click.stop="clear"
      />
      <UKbd v-else value="meta" size="sm" class="hidden md:inline-flex">
        ⌘K
      </UKbd>
    </template>
  </UInputMenu>
</template>
