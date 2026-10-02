import type { CategoryId, TypeInfo } from '@/lib/catalog';
import type { ServiceRecord } from '@/lib/types';
import { refDebounced, useLocalStorage } from '@vueuse/core';
import { computed, ref } from 'vue';
import { categories, describeType } from '@/lib/catalog';
import { useDiscovery } from './useDiscovery';

export type GroupBy = 'device' | 'type' | 'ipv4' | 'ipv6' | 'none';
export type ViewMode = 'grid' | 'list';
export type FilterKind = 'host' | 'ip' | 'type';

export interface FilterTag {
  id: string;
  kind: FilterKind;
  value: string;
  label: string;
  description?: string;
  icon: string;
  tile: string;
  ui: { tagsItem: string };
}

export interface ServiceEntry {
  service: ServiceRecord;
  info: TypeInfo;
}

export interface ServiceGroup {
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  tile: string;
  entries: ServiceEntry[];
  online: number;
}

const search = ref('');
const filterTags = ref<FilterTag[]>([]);
const category = ref<CategoryId | 'all'>('all');
const groupBy = useLocalStorage<GroupBy>('mdns:group-by', 'device');
const view = useLocalStorage<ViewMode>('mdns:view', 'grid');
const showOffline = useLocalStorage('mdns:show-offline', true);
const selectedId = ref<string>();

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function shortHost(host: string) {
  return host.replace(/\.local$/i, '');
}

function matches(entry: ServiceEntry, terms: string[]) {
  const { service, info } = entry;
  const haystack = [
    service.name,
    service.type,
    service.host,
    String(service.port),
    info.label,
    info.category.label,
    ...service.addresses.map(address => address.ip),
    ...service.txt.map(item => `${item.key}=${item.value ?? ''}`),
  ].join('\n').toLowerCase();

  return terms.every(term => haystack.includes(term));
}

const filterStyles: Record<Exclude<FilterKind, 'type'>, { icon: string; tile: string }> = {
  host: { icon: 'i-lucide-server', tile: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 ring-indigo-500/25' },
  ip: { icon: 'i-lucide-network', tile: 'bg-pink-500/12 text-pink-600 dark:text-pink-300 ring-pink-500/25' },
};

function makeTag(kind: FilterKind, value: string, label: string, description: string, icon: string, tile: string): FilterTag {
  return { id: `${kind}:${value}`, kind, value, label, description, icon, tile, ui: { tagsItem: tile } };
}

function entryValues(entry: ServiceEntry, kind: FilterKind) {
  if (kind === 'host')
    return [entry.service.host.toLowerCase()];
  if (kind === 'ip')
    return entry.service.addresses.map(address => address.ip);
  return [entry.service.serviceType];
}

function matchesTags(entry: ServiceEntry, tags: FilterTag[]) {
  const kinds = new Set(tags.map(tag => tag.kind));
  return [...kinds].every((kind) => {
    const values = entryValues(entry, kind);
    return tags.some(tag => tag.kind === kind && values.includes(tag.value));
  });
}

export function useServiceBrowser() {
  const discovery = useDiscovery();
  const debouncedSearch = refDebounced(search, 80);

  const entries = computed<ServiceEntry[]>(() => discovery.services.value.map(service => ({
    service,
    info: describeType(service.type),
  })));

  const visibleEntries = computed(() => entries.value.filter(entry => showOffline.value || entry.service.online));

  const categoryCounts = computed(() => {
    const counts = new Map<CategoryId, number>();
    for (const entry of visibleEntries.value)
      counts.set(entry.info.category.id, (counts.get(entry.info.category.id) ?? 0) + 1);
    return counts;
  });

  const filteredEntries = computed(() => {
    const terms = debouncedSearch.value.toLowerCase().split(/\s+/).filter(Boolean);
    return visibleEntries.value.filter(entry =>
      (category.value === 'all' || entry.info.category.id === category.value)
      && (!terms.length || matches(entry, terms))
      && (!filterTags.value.length || matchesTags(entry, filterTags.value)),
    );
  });

  const filterOptions = computed(() => {
    const options: Record<FilterKind, Map<string, FilterTag>> = { host: new Map(), ip: new Map(), type: new Map() };
    for (const { service, info } of visibleEntries.value) {
      const host = service.host.toLowerCase();
      if (!options.host.has(host))
        options.host.set(host, makeTag('host', host, shortHost(service.host), service.host, filterStyles.host.icon, filterStyles.host.tile));
      for (const address of service.addresses) {
        if (!options.ip.has(address.ip))
          options.ip.set(address.ip, makeTag('ip', address.ip, address.ip, shortHost(service.host), filterStyles.ip.icon, filterStyles.ip.tile));
      }
      if (!options.type.has(service.serviceType))
        options.type.set(service.serviceType, makeTag('type', service.serviceType, info.label, service.serviceType.replace(/\.local\.$/, ''), info.icon, info.category.tile));
    }
    return {
      host: [...options.host.values()].sort((a, b) => collator.compare(a.label, b.label)),
      ip: [...options.ip.values()].sort((a, b) => collator.compare(a.label, b.label)),
      type: [...options.type.values()].sort((a, b) => collator.compare(a.label, b.label)),
    };
  });

  const groups = computed<ServiceGroup[]>(() => {
    const buckets = new Map<string, ServiceEntry[]>();
    for (const entry of filteredEntries.value) {
      const addressFamily = groupBy.value === 'ipv4' ? 'ipv4' : groupBy.value === 'ipv6' ? 'ipv6' : undefined;
      const keys = addressFamily
        ? [...new Set(entry.service.addresses.filter(address => address.family === addressFamily).map(address => address.ip))]
        : [groupBy.value === 'device'
            ? entry.service.host.toLowerCase()
            : groupBy.value === 'type' ? entry.service.serviceType : 'all'];
      const fallbackKey = addressFamily === 'ipv4' ? 'No IPv4 address' : 'No IPv6 address';
      for (const key of (keys.length ? keys : [fallbackKey])) {
        const bucket = buckets.get(key);
        if (bucket)
          bucket.push(entry);
        else
          buckets.set(key, [entry]);
      }
    }

    const result = [...buckets.entries()].map(([key, items]): ServiceGroup => {
      items.sort((a, b) => collator.compare(a.service.name, b.service.name) || collator.compare(a.info.label, b.info.label));
      const first = items[0]!;
      const online = items.filter(item => item.service.online).length;

      if (groupBy.value === 'device') {
        const dominant = mostCommon([first.info.category.id, ...items.slice(1).map(item => item.info.category.id)]);
        return {
          key,
          title: shortHost(first.service.host),
          subtitle: first.service.addresses[0]?.ip,
          icon: categories[dominant].icon,
          tile: categories[dominant].tile,
          entries: items,
          online,
        };
      }
      if (groupBy.value === 'type') {
        return {
          key,
          title: first.info.label,
          subtitle: first.service.serviceType.replace(/\.local\.$/, ''),
          icon: first.info.icon,
          tile: first.info.category.tile,
          entries: items,
          online,
        };
      }
      if (groupBy.value === 'ipv4' || groupBy.value === 'ipv6') {
        return {
          key,
          title: key,
          icon: groupBy.value === 'ipv4' ? 'i-lucide-network' : 'i-lucide-globe-2',
          tile: categories.other.tile,
          entries: items,
          online,
        };
      }
      return { key, title: 'All services', icon: 'i-lucide-layers', tile: categories.other.tile, entries: items, online };
    });

    return result.sort((a, b) => collator.compare(a.title, b.title));
  });

  const selected = computed(() => entries.value.find(entry => entry.service.id === selectedId.value));

  const stats = computed(() => {
    const all = discovery.services.value;
    return {
      total: all.length,
      online: all.filter(service => service.online).length,
      devices: new Set(all.map(service => service.host.toLowerCase())).size,
      types: new Set(all.map(service => service.serviceType)).size,
    };
  });

  return {
    ...discovery,
    search,
    filterTags,
    filterOptions,
    category,
    groupBy,
    view,
    showOffline,
    selectedId,
    selected,
    categoryCounts,
    filteredEntries,
    groups,
    stats,
  };
}

function mostCommon<T>(values: [T, ...T[]]): T {
  const counts = new Map<T, number>();
  let best = values[0];
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > (counts.get(best) ?? 0))
      best = value;
  }
  return best;
}
