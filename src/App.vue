<script setup lang="ts">
import type { GroupBy, ViewMode } from '@/composables/useServiceBrowser';
import { defineShortcuts } from '@nuxt/ui/composables';
import { useLocalStorage, useWindowSize } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';
import AppSidebar from '@/components/AppSidebar.vue';
import ResizeSeparator from '@/components/ResizeSeparator.vue';
import ScanRadar from '@/components/ScanRadar.vue';
import ServiceCard from '@/components/ServiceCard.vue';
import ServiceDetails from '@/components/ServiceDetails.vue';
import ServiceIcon from '@/components/ServiceIcon.vue';
import ServiceRow from '@/components/ServiceRow.vue';
import { useServiceBrowser } from '@/composables/useServiceBrowser';
import { useTitlebarInset } from '@/composables/useTitlebarInset';
import { categories } from '@/lib/catalog';

void useTitlebarInset();

const {
  search,
  category,
  groupBy,
  view,
  showOffline,
  selectedId,
  selected,
  groups,
  filteredEntries,
  stats,
  ready,
  error,
  rescan,
} = useServiceBrowser();

const searchInput = useTemplateRef('searchInput');

const DETAILS_MIN = 320;
const DETAILS_DEFAULT = 400;
const detailsWidth = useLocalStorage('mdns:details-width', DETAILS_DEFAULT);
const { width: windowWidth } = useWindowSize();
const detailsMax = computed(() => Math.max(DETAILS_MIN, Math.min(760, windowWidth.value - 560)));
const detailsSize = computed(() => Math.min(detailsMax.value, Math.max(DETAILS_MIN, detailsWidth.value)));

const title = computed(() => category.value === 'all' ? 'All services' : categories[category.value].label);

const groupByItems: { label: string; value: GroupBy; icon: string }[] = [
  { label: 'Device', value: 'device', icon: 'i-lucide-server' },
  { label: 'Service type', value: 'type', icon: 'i-lucide-shapes' },
  { label: 'IPv4 address', value: 'ipv4', icon: 'i-lucide-network' },
  { label: 'IPv6 address', value: 'ipv6', icon: 'i-lucide-globe-2' },
  { label: 'No grouping', value: 'none', icon: 'i-lucide-rows-3' },
];

const viewItems: { value: ViewMode; icon: string; label: string }[] = [
  { value: 'grid', icon: 'i-lucide-layout-grid', label: 'Grid' },
  { value: 'list', icon: 'i-lucide-list', label: 'List' },
];

const isEmpty = computed(() => stats.value.total === 0);
const noMatches = computed(() => !isEmpty.value && filteredEntries.value.length === 0);

function toggle(id: string) {
  selectedId.value = selectedId.value === id ? undefined : id;
}

function resetFilters() {
  search.value = '';
  category.value = 'all';
  showOffline.value = true;
}

defineShortcuts({
  meta_k: () => searchInput.value?.inputRef?.focus(),
  meta_f: () => searchInput.value?.inputRef?.focus(),
  meta_r: () => rescan(),
  meta_1: () => { view.value = 'grid'; },
  meta_2: () => { view.value = 'list'; },
  escape: {
    usingInput: true,
    handler: () => {
      if (selectedId.value)
        selectedId.value = undefined;
      else if (search.value)
        search.value = '';
    },
  },
});
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right' }" :tooltip="{ delayDuration: 250 }">
    <UDashboardGroup storage="local" storage-key="mdns-viewer" unit="px">
      <AppSidebar />

      <UDashboardPanel id="services" :ui="{ root: 'app-canvas', body: 'gap-8 sm:gap-8 p-4 sm:p-6' }">
        <template #header>
          <UDashboardNavbar
            data-tauri-drag-region
            :toggle="false"
            :ui="{ root: 'bg-default/80 backdrop-blur-md', title: 'pointer-events-none' }"
          >
            <template #title>
              <span>{{ title }}</span>
              <span class="font-mono text-sm font-normal text-dimmed">{{ filteredEntries.length }}</span>
            </template>

            <template #right>
              <UInput
                ref="searchInput"
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search name, host, IP, TXT…"
                size="sm"
                class="w-40 md:w-64 xl:w-80"
                autocomplete="off"
                spellcheck="false"
                :ui="{ trailing: 'pe-1.5' }"
              >
                <template #trailing>
                  <UButton
                    v-if="search"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="link"
                    size="xs"
                    aria-label="Clear search"
                    @click="search = ''"
                  />
                  <UKbd v-else value="meta" size="sm" class="hidden md:inline-flex">
                    ⌘K
                  </UKbd>
                </template>
              </UInput>
            </template>
          </UDashboardNavbar>

          <UDashboardToolbar :ui="{ root: 'bg-default/60 backdrop-blur-md', left: 'gap-2', right: 'gap-2' }">
            <template #left>
              <USelect
                v-model="groupBy"
                :items="groupByItems"
                :icon="groupByItems.find(item => item.value === groupBy)?.icon"
                size="sm"
                variant="ghost"
                class="w-40"
              />
            </template>
            <template #right>
              <USwitch v-model="showOffline" label="Show offline" size="sm" />
              <USeparator orientation="vertical" class="h-5" />
              <UFieldGroup size="sm">
                <UTooltip v-for="item in viewItems" :key="item.value" :text="`${item.label} view`">
                  <UButton
                    :icon="item.icon"
                    :aria-label="`${item.label} view`"
                    color="neutral"
                    :variant="view === item.value ? 'soft' : 'ghost'"
                    @click="view = item.value"
                  />
                </UTooltip>
              </UFieldGroup>
            </template>
          </UDashboardToolbar>
        </template>

        <template #body>
          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            title="mDNS discovery failed"
            :description="error"
            :actions="[{ label: 'Retry', color: 'error', variant: 'solid', onClick: rescan }]"
          />

          <div v-if="isEmpty && !error" class="m-auto flex flex-col items-center gap-6 py-16 text-center">
            <ScanRadar :size="140" />
            <div class="space-y-1">
              <p class="font-medium text-highlighted">
                {{ ready ? 'Listening for services…' : 'Starting discovery…' }}
              </p>
              <p class="max-w-xs text-sm text-muted">
                Devices that advertise over Bonjour / Zeroconf show up here as they answer.
              </p>
            </div>
          </div>

          <UEmpty
            v-else-if="noMatches"
            icon="i-lucide-search-x"
            title="Nothing matches your filters"
            :description="search ? `No service matches “${search}”.` : 'Try another category or show offline services.'"
            :actions="[{ label: 'Clear filters', icon: 'i-lucide-filter-x', color: 'neutral', variant: 'soft', onClick: resetFilters }]"
            class="m-auto"
          />

          <template v-else>
            <section v-for="group in groups" :key="group.key" class="space-y-3">
              <header v-if="groupBy !== 'none'" class="flex items-center gap-3">
                <ServiceIcon :icon="group.icon" :tile="group.tile" size="sm" />
                <div class="flex min-w-0 items-baseline gap-2">
                  <h2 class="truncate text-sm font-semibold text-highlighted selectable">
                    {{ group.title }}
                  </h2>
                  <span v-if="group.subtitle" class="truncate font-mono text-xs text-dimmed selectable">{{ group.subtitle }}</span>
                </div>
                <div class="h-px flex-1 bg-(--ui-border)" />
                <span class="shrink-0 font-mono text-xs text-muted">
                  {{ group.online }}<span class="text-dimmed">/{{ group.entries.length }}</span>
                </span>
              </header>

              <div v-if="view === 'grid'" class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                <ServiceCard
                  v-for="entry in group.entries"
                  :key="entry.service.id"
                  :entry="entry"
                  :selected="entry.service.id === selectedId"
                  :show-host="groupBy !== 'device'"
                  @select="toggle(entry.service.id)"
                />
              </div>

              <div v-else class="divide-y divide-default overflow-hidden rounded-xl border border-default bg-default shadow-xs">
                <ServiceRow
                  v-for="entry in group.entries"
                  :key="entry.service.id"
                  :entry="entry"
                  :selected="entry.service.id === selectedId"
                  @select="toggle(entry.service.id)"
                />
              </div>
            </section>
          </template>
        </template>
      </UDashboardPanel>

      <ResizeSeparator
        v-if="selected"
        :model-value="detailsSize"
        :min="DETAILS_MIN"
        :max="detailsMax"
        :default-size="DETAILS_DEFAULT"
        label="Resize details panel"
        @update:model-value="detailsWidth = $event"
      />
      <UDashboardPanel
        v-if="selected"
        id="details"
        :style="{ width: `${detailsSize}px` }"
        :ui="{ root: 'flex-none bg-default', body: 'p-0 sm:p-0 gap-0' }"
      >
        <template #body>
          <ServiceDetails :entry="selected" @select="selectedId = $event">
            <template #close>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Close details"
                class="-mt-1 -mr-2"
                @click="selectedId = undefined"
              />
            </template>
          </ServiceDetails>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>
