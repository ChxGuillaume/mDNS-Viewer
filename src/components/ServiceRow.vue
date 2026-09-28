<script setup lang="ts">
import type { ServiceEntry } from '@/composables/useServiceBrowser';
import { computed } from 'vue';
import { useActions } from '@/composables/useActions';
import { relativeTime, useNow } from '@/composables/useNow';
import { shortHost } from '@/composables/useServiceBrowser';
import { isBrowserUrl, serviceUrl } from '@/lib/catalog';
import ServiceIcon from './ServiceIcon.vue';
import StatusDot from './StatusDot.vue';

const props = defineProps<{ entry: ServiceEntry; selected?: boolean }>();
defineEmits<{ select: [] }>();

const { open } = useActions();
const now = useNow();

const service = computed(() => props.entry.service);
const url = computed(() => serviceUrl(service.value));
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_5.5rem_2rem] items-center gap-4 px-3 py-2 text-sm outline-none transition-colors hover:bg-elevated/60 focus-visible:bg-elevated"
    :class="[selected ? 'bg-primary/8' : '', { 'opacity-55': !service.online }]"
    @click="$emit('select')"
    @keydown.enter.prevent="$emit('select')"
  >
    <div class="flex min-w-0 items-center gap-3">
      <ServiceIcon :icon="entry.info.icon" :tile="entry.info.category.tile" size="sm" />
      <span class="truncate font-medium text-highlighted">{{ service.name }}</span>
    </div>
    <span class="truncate text-muted">{{ entry.info.label }}</span>
    <span class="truncate font-mono text-xs text-muted">
      {{ shortHost(service.host) }}<span v-if="service.port" class="text-dimmed">:{{ service.port }}</span>
    </span>
    <span class="flex items-center gap-1.5 text-xs text-dimmed">
      <StatusDot :online="service.online" />
      {{ service.online ? relativeTime(service.firstSeen, now.getTime()) : 'offline' }}
    </span>
    <UButton
      v-if="url && isBrowserUrl(url)"
      icon="i-lucide-arrow-up-right"
      size="xs"
      color="neutral"
      variant="ghost"
      class="opacity-0 group-hover:opacity-100"
      aria-label="Open in browser"
      @click.stop="open(url)"
    />
  </div>
</template>
