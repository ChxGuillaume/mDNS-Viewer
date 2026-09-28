<script setup lang="ts">
import type { CategoryId } from '@/lib/catalog';
import { defineShortcuts } from '@nuxt/ui/composables';
import { computed, ref } from 'vue';
import { relativeTime, useNow } from '@/composables/useNow';
import { useServiceBrowser } from '@/composables/useServiceBrowser';
import { categories } from '@/lib/catalog';
import ThemeSwitcher from './ThemeSwitcher.vue';

const { category, categoryCounts, stats, startedAt, lastActivity, rescan, error } = useServiceBrowser();
const now = useNow();

const collapsed = ref(false);

const scanning = computed(() => now.value.getTime() - lastActivity.value < 4000 || now.value.getTime() - startedAt.value < 6000);
const status = computed(() => error.value ? 'Discovery error' : scanning.value ? 'Scanning…' : 'Listening');
const statsSummary = computed(() => `${stats.value.online} online · ${stats.value.devices} devices · ${stats.value.types} types`);

interface NavItem {
  id: CategoryId | 'all';
  label: string;
  icon: string;
  count: number;
}

const allItem = computed<NavItem>(() => ({
  id: 'all',
  label: 'All services',
  icon: 'i-lucide-layout-grid',
  count: [...categoryCounts.value.values()].reduce((sum, count) => sum + count, 0),
}));

const categoryItems = computed<NavItem[]>(() => (Object.keys(categories) as CategoryId[])
  .filter(id => categoryCounts.value.get(id))
  .map(id => ({ id, label: categories[id].label, icon: categories[id].icon, count: categoryCounts.value.get(id)! })));

defineShortcuts({
  meta_b: () => {
    collapsed.value = !collapsed.value;
  },
});
</script>

<template>
  <UDashboardSidebar
    id="sidebar"
    v-model:collapsed="collapsed"
    collapsible
    :resizable="false"
    :default-size="248"
    :collapsed-size="80"
    :ui="{
      root: 'flex bg-(--app-sidebar) transition-[width] duration-200 ease-out',
      header: 'h-auto py-3 titlebar:pt-(--ui-header-height) in-data-[collapsed=true]:px-3',
      body: 'in-data-[collapsed=true]:px-3',
      footer: 'flex-col items-stretch gap-3 border-t border-default py-3 in-data-[collapsed=true]:px-3',
    }"
  >
    <template #header>
      <div data-tauri-drag-region class="absolute inset-x-0 top-0 hidden h-(--ui-header-height) titlebar:block" />
      <div data-tauri-drag-region class="flex w-full items-center gap-2.5" :class="{ 'justify-center': collapsed }">
        <UTooltip :text="`mDNS Viewer · ${status}`" :disabled="!collapsed" :content="{ side: 'right', sideOffset: 12 }">
          <span class="relative shrink-0">
            <img src="/logo.svg" alt="mDNS Viewer" class="pointer-events-none size-8 drop-shadow-sm" draggable="false">
            <span v-if="collapsed" class="absolute -right-0.5 -bottom-0.5 inline-flex size-2 rounded-full ring-2 ring-(--app-sidebar)">
              <span v-if="scanning" class="absolute inset-0 animate-ping-slow rounded-full bg-primary" />
              <span class="relative size-2 rounded-full" :class="error ? 'bg-error' : 'bg-primary'" />
            </span>
          </span>
        </UTooltip>
        <div v-if="!collapsed" class="pointer-events-none min-w-0">
          <p class="text-sm leading-tight font-semibold text-highlighted">
            mDNS Viewer
          </p>
          <p class="flex items-center gap-1.5 text-xs text-muted">
            <span class="relative inline-flex size-1.5">
              <span v-if="scanning" class="absolute inset-0 animate-ping-slow rounded-full bg-primary" />
              <span class="relative size-1.5 rounded-full" :class="error ? 'bg-error' : 'bg-primary'" />
            </span>
            {{ status }}
          </p>
        </div>
      </div>
    </template>

    <nav class="flex flex-col gap-0.5" :class="{ 'items-center': collapsed }" aria-label="Categories">
      <template v-for="(item, index) in [allItem, ...categoryItems]" :key="item.id">
        <USeparator v-if="index === 1 && collapsed" class="my-2 w-6" />
        <p v-else-if="index === 1" class="px-2.5 pt-4 pb-1.5 text-xs font-medium text-muted">
          Categories
        </p>

        <UTooltip
          :text="`${item.label} · ${item.count}`"
          :disabled="!collapsed"
          :content="{ side: 'right', sideOffset: 12 }"
        >
          <UButton
            :icon="item.icon"
            :label="collapsed ? undefined : item.label"
            :aria-label="item.label"
            :aria-current="category === item.id ? 'page' : undefined"
            :square="collapsed"
            :block="!collapsed"
            :color="category === item.id ? 'primary' : 'neutral'"
            :variant="category === item.id ? 'soft' : 'ghost'"
            :class="collapsed ? 'size-9 justify-center' : 'justify-start'"
            :ui="{ leadingIcon: 'size-4.5', label: 'flex-1 text-left truncate' }"
            @click="category = item.id"
          >
            <template v-if="!collapsed" #trailing>
              <UBadge :label="String(item.count)" color="neutral" variant="subtle" size="sm" class="font-mono" />
            </template>
          </UButton>
        </UTooltip>
      </template>
    </nav>

    <template #footer>
      <template v-if="collapsed">
        <UTooltip :text="statsSummary" :content="{ side: 'right', sideOffset: 12 }">
          <div class="mx-auto flex w-11 flex-col items-center rounded-md bg-elevated/60 py-1.5">
            <span class="font-mono text-sm font-semibold text-highlighted">{{ stats.online }}</span>
            <span class="text-[0.625rem] text-muted">online</span>
          </div>
        </UTooltip>
        <div class="flex flex-col items-center gap-1">
          <UTooltip :text="`Rescan network · started ${relativeTime(startedAt, now.getTime())}`" :kbds="['meta', 'R']" :content="{ side: 'right', sideOffset: 12 }">
            <UButton icon="i-lucide-radar" color="neutral" variant="ghost" square class="size-9 justify-center" aria-label="Rescan network" @click="rescan" />
          </UTooltip>
          <ThemeSwitcher side="right" square class="size-9 justify-center" />
          <UTooltip text="Expand sidebar" :kbds="['meta', 'B']" :content="{ side: 'right', sideOffset: 12 }">
            <UButton
              icon="i-lucide-panel-left-open"
              color="neutral"
              variant="ghost"
              square
              class="size-9 justify-center"
              aria-label="Expand sidebar"
              @click="collapsed = false"
            />
          </UTooltip>
        </div>
      </template>

      <template v-else>
        <div class="grid grid-cols-3 gap-1.5 text-center">
          <div v-for="stat in [['online', stats.online], ['devices', stats.devices], ['types', stats.types]]" :key="stat[0]" class="rounded-md bg-elevated/60 px-1 py-1.5">
            <p class="font-mono text-sm font-semibold text-highlighted">
              {{ stat[1] }}
            </p>
            <p class="text-[0.6875rem] text-muted">
              {{ stat[0] }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <UTooltip :text="`Rescan network · started ${relativeTime(startedAt, now.getTime())}`" :kbds="['meta', 'R']">
            <UButton icon="i-lucide-radar" label="Rescan" color="neutral" variant="soft" size="sm" @click="rescan" />
          </UTooltip>
          <span class="flex-1" />
          <ThemeSwitcher size="sm" />
          <UTooltip text="Collapse sidebar" :kbds="['meta', 'B']">
            <UButton
              icon="i-lucide-panel-left-close"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Collapse sidebar"
              @click="collapsed = true"
            />
          </UTooltip>
        </div>
      </template>
    </template>
  </UDashboardSidebar>
</template>
