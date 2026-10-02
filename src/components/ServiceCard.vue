<script setup lang="ts">
import type { ServiceEntry } from '@/composables/useServiceBrowser';
import { computed } from 'vue';
import { useActions } from '@/composables/useActions';
import { useNow, useRelativeTime } from '@/composables/useNow';
import { shortHost } from '@/composables/useServiceBrowser';
import { isBrowserUrl, serviceUrl } from '@/lib/catalog';
import ServiceIcon from './ServiceIcon.vue';
import StatusDot from './StatusDot.vue';

const props = defineProps<{ entry: ServiceEntry; selected?: boolean; showHost?: boolean }>();
defineEmits<{ select: [] }>();

const { open } = useActions();
const now = useNow();

const service = computed(() => props.entry.service);
const url = computed(() => serviceUrl(service.value));
const isFresh = computed(() => now.value.getTime() - service.value.firstSeen < 15_000);
const firstSeen = useRelativeTime(() => service.value.firstSeen);
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group relative flex animate-rise flex-col gap-3 rounded-xl border bg-default p-3.5 text-left shadow-xs outline-none transition-all duration-150 hover:-translate-y-px hover:border-accented hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
    :class="[
      selected ? 'border-primary/60 ring-1 ring-primary/40' : 'border-default',
      { 'opacity-55 saturate-0': !service.online },
    ]"
    @click="$emit('select')"
    @keydown.enter.prevent="$emit('select')"
  >
    <div class="flex items-start gap-3">
      <ServiceIcon :icon="entry.info.icon" :tile="entry.info.category.tile" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-highlighted" :title="service.name">
          {{ service.name }}
        </p>
        <p class="truncate text-xs text-muted">
          {{ entry.info.label }}
        </p>
      </div>
      <UTooltip v-if="url && isBrowserUrl(url)" :text="`Open ${url}`">
        <UButton
          icon="i-lucide-arrow-up-right"
          size="xs"
          color="neutral"
          variant="ghost"
          class="-mt-1 -mr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Open in browser"
          @click.stop="open(url)"
        />
      </UTooltip>
    </div>

    <div class="flex items-center gap-2 text-xs text-muted">
      <StatusDot :online="service.online" :pulse="isFresh" />
      <span class="truncate font-mono">
        <template v-if="showHost">{{ shortHost(service.host) }}</template><span v-if="service.port" class="text-dimmed">:{{ service.port }}</span>
      </span>
      <span class="ms-auto shrink-0 text-dimmed">
        {{ service.online ? firstSeen : 'offline' }}
      </span>
    </div>
  </div>
</template>
