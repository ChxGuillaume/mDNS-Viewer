<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import type { CategoryId } from '@/lib/catalog';
import { computed } from 'vue';
import { relativeTime, useNow } from '@/composables/useNow';
import { useServiceBrowser } from '@/composables/useServiceBrowser';
import { categories } from '@/lib/catalog';

const { category, categoryCounts, stats, startedAt, lastActivity, rescan, error } = useServiceBrowser();
const now = useNow();

const scanning = computed(() => now.value.getTime() - lastActivity.value < 4000 || now.value.getTime() - startedAt.value < 6000);

const items = computed<NavigationMenuItem[][]>(() => {
  const total = [...categoryCounts.value.values()].reduce((sum, count) => sum + count, 0);
  const select = (id: CategoryId | 'all') => () => {
    category.value = id;
  };

  const categoryItems = (Object.keys(categories) as CategoryId[])
    .filter(id => categoryCounts.value.get(id))
    .map(id => ({
      label: categories[id].label,
      icon: categories[id].icon,
      badge: { label: String(categoryCounts.value.get(id)), color: 'neutral' as const, variant: 'subtle' as const, size: 'sm' as const },
      active: category.value === id,
      onSelect: select(id),
    }));

  return [
    [{
      label: 'All services',
      icon: 'i-lucide-layout-grid',
      badge: { label: String(total), color: 'neutral', variant: 'subtle', size: 'sm' },
      active: category.value === 'all',
      onSelect: select('all'),
    }],
    categoryItems.length ? [{ label: 'Categories', type: 'label' as const }, ...categoryItems] : [],
  ];
});
</script>

<template>
  <UDashboardSidebar
    id="sidebar"
    resizable
    collapsible
    :default-size="248"
    :min-size="208"
    :max-size="340"
    :ui="{
      root: 'bg-(--app-sidebar)',
      header: 'mac:pt-7 h-auto py-3',
      footer: 'flex-col items-stretch gap-3 border-t border-default py-3',
    }"
  >
    <template #header="{ collapsed }">
      <div data-tauri-drag-region class="flex w-full items-center gap-2.5">
        <img src="/logo.png" alt="" class="pointer-events-none size-8 shrink-0 rounded-lg shadow-sm" draggable="false">
        <div v-if="!collapsed" class="pointer-events-none min-w-0">
          <p class="text-sm leading-tight font-semibold text-highlighted">
            mDNS Viewer
          </p>
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <span class="relative inline-flex size-1.5">
              <span v-if="scanning" class="absolute inset-0 animate-ping-slow rounded-full bg-primary" />
              <span class="relative size-1.5 rounded-full" :class="error ? 'bg-error' : 'bg-primary'" />
            </span>
            {{ error ? 'Discovery error' : scanning ? 'Scanning…' : 'Listening' }}
          </p>
        </div>
      </div>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :items="items"
        :collapsed="collapsed"
        orientation="vertical"
        tooltip
        :ui="{ link: 'py-1.5', linkLeadingIcon: 'size-4' }"
      />
    </template>

    <template #footer="{ collapsed }">
      <div v-if="!collapsed" class="grid grid-cols-3 gap-1.5 text-center">
        <div class="rounded-md bg-elevated/60 px-1 py-1.5">
          <p class="font-mono text-sm font-semibold text-highlighted">
            {{ stats.online }}
          </p>
          <p class="text-[0.6875rem] text-muted">
            online
          </p>
        </div>
        <div class="rounded-md bg-elevated/60 px-1 py-1.5">
          <p class="font-mono text-sm font-semibold text-highlighted">
            {{ stats.devices }}
          </p>
          <p class="text-[0.6875rem] text-muted">
            devices
          </p>
        </div>
        <div class="rounded-md bg-elevated/60 px-1 py-1.5">
          <p class="font-mono text-sm font-semibold text-highlighted">
            {{ stats.types }}
          </p>
          <p class="text-[0.6875rem] text-muted">
            types
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1" :class="collapsed ? 'flex-col' : ''">
        <UTooltip text="Rescan network" :kbds="['meta', 'R']">
          <UButton
            icon="i-lucide-radar"
            :label="collapsed ? undefined : 'Rescan'"
            color="neutral"
            variant="soft"
            size="sm"
            @click="rescan"
          />
        </UTooltip>
        <span v-if="!collapsed" class="ms-1 flex-1 truncate text-xs text-dimmed" :title="new Date(startedAt).toLocaleString()">
          started {{ relativeTime(startedAt, now.getTime()) }}
        </span>
        <UColorModeButton size="sm" />
      </div>
    </template>
  </UDashboardSidebar>
</template>
