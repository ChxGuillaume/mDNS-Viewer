<script setup lang="ts">
import type { ServiceEntry } from '@/composables/useServiceBrowser';
import { computed } from 'vue';
import { useActions } from '@/composables/useActions';
import { relativeTime, useNow } from '@/composables/useNow';
import { useServiceBrowser } from '@/composables/useServiceBrowser';
import { isBrowserUrl, serviceUrl, sshCommand } from '@/lib/catalog';
import CopyValue from './CopyValue.vue';
import ServiceIcon from './ServiceIcon.vue';
import StatusDot from './StatusDot.vue';

const props = defineProps<{ entry: ServiceEntry }>();
const emit = defineEmits<{ select: [id: string] }>();

const { copy, open } = useActions();
const { filteredEntries } = useServiceBrowser();
const now = useNow();

const service = computed(() => props.entry.service);
const url = computed(() => serviceUrl(service.value));
const ssh = computed(() => sshCommand(service.value));

const ipUrl = computed(() => {
  const address = service.value.addresses.find(a => a.family === 'ipv4' && !a.linkLocal);
  return address ? serviceUrl(service.value, address.ip) : undefined;
});

const siblings = computed(() => filteredEntries.value.filter(entry =>
  entry.service.host.toLowerCase() === service.value.host.toLowerCase() && entry.service.id !== service.value.id,
));

const connection = computed(() => [
  { label: 'Host', value: service.value.host },
  { label: 'Port', value: String(service.value.port) },
  { label: 'Type', value: service.value.serviceType },
  {
    label: service.value.type === 'matter' && /^I[0-9A-F]{16}$/i.test(service.value.subtype ?? '')
      ? 'Matter fabric ID'
      : 'Subtype',
    value: service.value.subtype ?? undefined,
  },
  { label: 'Subtype domain', value: service.value.subtypeDomain ?? undefined },
  { label: 'Full name', value: service.value.id },
].filter((row): row is { label: string; value: string } => !!row.value));

const txtJson = computed(() => JSON.stringify(
  Object.fromEntries(service.value.txt.map(entry => [entry.key, entry.value])),
  null,
  2,
));

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-start gap-4 border-b border-default px-5 pt-5 pb-4">
      <ServiceIcon :icon="entry.info.icon" :tile="entry.info.category.tile" size="lg" />
      <div class="min-w-0 flex-1 space-y-1">
        <h2 class="line-clamp-2 text-base leading-snug font-semibold break-words text-highlighted selectable" :title="service.name">
          {{ service.name }}
        </h2>
        <div class="flex flex-wrap items-center gap-1.5">
          <UBadge :label="entry.info.label" color="neutral" variant="soft" size="sm" />
          <UBadge :label="service.protocol.toUpperCase()" color="neutral" variant="outline" size="sm" />
          <UBadge v-if="service.online" color="success" variant="soft" size="sm">
            <StatusDot online />
            Online
          </UBadge>
          <UBadge v-else color="neutral" variant="soft" size="sm" label="Offline" icon="i-lucide-unplug" />
        </div>
      </div>
      <slot name="close" />
    </header>

    <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
      <div v-if="url || ssh" class="flex flex-wrap gap-2">
        <UButton
          v-if="url && isBrowserUrl(url)"
          icon="i-lucide-external-link"
          label="Open in browser"
          size="sm"
          @click="open(url)"
        />
        <UButton
          v-else-if="url"
          icon="i-lucide-external-link"
          :label="`Open ${url.split(':')[0]}://`"
          size="sm"
          @click="open(url)"
        />
        <UButton
          v-if="ipUrl && ipUrl !== url && isBrowserUrl(ipUrl)"
          icon="i-lucide-globe"
          label="Open by IP"
          color="neutral"
          variant="soft"
          size="sm"
          @click="open(ipUrl)"
        />
        <UButton
          v-if="url"
          icon="i-lucide-link"
          label="Copy URL"
          color="neutral"
          variant="soft"
          size="sm"
          @click="copy(url, 'URL')"
        />
        <UButton
          v-if="ssh"
          icon="i-lucide-square-terminal"
          label="Copy command"
          color="neutral"
          variant="soft"
          size="sm"
          @click="copy(ssh, 'Command')"
        />
      </div>

      <section class="space-y-2">
        <h3 class="text-xs font-medium tracking-wide text-dimmed uppercase">
          Connection
        </h3>
        <dl class="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          <template v-for="row in connection" :key="row.label">
            <dt class="py-0.5 whitespace-nowrap text-muted">
              {{ row.label }}
            </dt>
            <dd class="min-w-0">
              <CopyValue :value="row.value" :label="row.label" mono wrap />
            </dd>
          </template>
        </dl>
      </section>

      <section class="space-y-2">
        <h3 class="flex items-center justify-between text-xs font-medium tracking-wide text-dimmed uppercase">
          Addresses
          <span class="font-mono normal-case">{{ service.addresses.length }}</span>
        </h3>
        <ul class="divide-y divide-default overflow-hidden rounded-lg border border-default">
          <li v-for="address in service.addresses" :key="address.ip" class="flex items-center gap-2 px-3 py-2">
            <UBadge
              :label="address.family === 'ipv4' ? 'IPv4' : 'IPv6'"
              :color="address.family === 'ipv4' ? 'primary' : 'secondary'"
              variant="subtle"
              size="sm"
              class="shrink-0 font-mono"
            />
            <div class="min-w-0 flex-1">
              <CopyValue :value="address.ip" label="Address" mono class="max-w-full" />
            </div>
            <span v-if="address.linkLocal" class="shrink-0 text-xs text-dimmed">link-local</span>
            <UBadge v-for="iface in address.interfaces" :key="iface" :label="iface" color="neutral" variant="outline" size="sm" class="shrink-0 font-mono" />
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h3 class="flex items-center justify-between text-xs font-medium tracking-wide text-dimmed uppercase">
          TXT records
          <UButton
            v-if="service.txt.length"
            label="Copy JSON"
            icon="i-lucide-braces"
            size="xs"
            color="neutral"
            variant="ghost"
            class="-my-1 normal-case"
            @click="copy(txtJson, 'TXT records', `JSON · ${service.txt.length} records`)"
          />
        </h3>
        <div v-if="service.txt.length" class="grid grid-cols-[minmax(3rem,max-content)_minmax(0,1fr)] overflow-hidden rounded-lg border border-default bg-muted/50">
          <div
            v-for="(item, index) in service.txt"
            :key="`${item.key}-${index}`"
            class="col-span-2 grid grid-cols-subgrid items-baseline gap-3 border-b border-default px-3 py-1.5 font-mono text-xs last:border-b-0"
          >
            <span class="max-w-32 wrap-anywhere text-primary selectable">{{ item.key }}</span>
            <span v-if="item.value === null" class="text-dimmed italic">flag</span>
            <CopyValue v-else :value="item.value" :label="item.key" wrap class="text-default">
              {{ item.value || '""' }}
              <UBadge v-if="item.binary" label="hex" size="sm" color="warning" variant="soft" class="ms-1" />
            </CopyValue>
          </div>
        </div>
        <p v-else class="text-sm text-dimmed">
          No TXT records published.
        </p>
      </section>

      <section v-if="siblings.length" class="space-y-2">
        <h3 class="text-xs font-medium tracking-wide text-dimmed uppercase">
          Also on this device
        </h3>
        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="sibling in siblings"
            :key="sibling.service.id"
            :icon="sibling.info.icon"
            :label="sibling.info.label"
            class="max-w-full"
            size="xs"
            color="neutral"
            variant="outline"
            @click="emit('select', sibling.service.id)"
          />
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-xs font-medium tracking-wide text-dimmed uppercase">
          Activity
        </h3>
        <dl class="grid grid-cols-3 gap-2 text-sm">
          <div class="min-w-0 rounded-lg border border-default px-3 py-2">
            <dt class="truncate text-xs text-muted">
              First seen
            </dt>
            <dd class="truncate font-mono text-highlighted" :title="formatDate(service.firstSeen)">
              {{ relativeTime(service.firstSeen, now.getTime()) }}
            </dd>
          </div>
          <div class="min-w-0 rounded-lg border border-default px-3 py-2">
            <dt class="truncate text-xs text-muted">
              {{ service.online ? 'Last update' : 'Went offline' }}
            </dt>
            <dd class="truncate font-mono text-highlighted" :title="formatDate(service.lastSeen)">
              {{ relativeTime(service.lastSeen, now.getTime()) }}
            </dd>
          </div>
          <div class="min-w-0 rounded-lg border border-default px-3 py-2">
            <dt class="truncate text-xs text-muted">
              Updates
            </dt>
            <dd class="truncate font-mono text-highlighted">
              {{ service.updates }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
