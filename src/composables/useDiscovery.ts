import type { DiscoveryEvent, ServiceRecord, Snapshot } from '@/lib/types';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { computed, readonly, ref, shallowRef, triggerRef } from 'vue';

const EVENT_NAME = 'mdns://event';

const services = shallowRef(new Map<string, ServiceRecord>());
const types = ref(new Set<string>());
const startedAt = ref(Date.now());
const lastActivity = ref(Date.now());
const ready = ref(false);
const error = ref<string>();
let revision = 0;
let initialized = false;

function applySnapshot(snapshot: Snapshot) {
  revision = snapshot.revision;
  startedAt.value = snapshot.startedAt;
  types.value = new Set(snapshot.types);
  services.value = new Map(snapshot.services.map(service => [service.id, service]));
}

function applyEvent(event: DiscoveryEvent) {
  if (event.revision <= revision)
    return;
  revision = event.revision;
  lastActivity.value = Date.now();

  switch (event.kind) {
    case 'cleared':
      services.value = new Map();
      types.value = new Set();
      startedAt.value = Date.now();
      break;
    case 'typeDiscovered':
      types.value.add(event.serviceType);
      break;
    case 'upserted':
      services.value.set(event.service.id, event.service);
      triggerRef(services);
      break;
  }
}

async function connectTauri() {
  const pending: DiscoveryEvent[] = [];
  let synced = false;

  await listen<DiscoveryEvent>(EVENT_NAME, ({ payload }) => {
    if (synced)
      applyEvent(payload);
    else
      pending.push(payload);
  });

  applySnapshot(await invoke<Snapshot>('snapshot'));
  synced = true;
  pending.forEach(applyEvent);
}

async function connectMock() {
  const { mockStream } = await import('@/lib/mock');
  mockStream(applyEvent);
}

function init() {
  if (initialized)
    return;
  initialized = true;

  const connect = isTauri() ? connectTauri : connectMock;
  connect()
    .catch((e) => {
      error.value = String(e);
      console.error(e);
    })
    .finally(() => {
      ready.value = true;
    });
}

async function rescan() {
  error.value = undefined;
  if (!isTauri()) {
    revision = 0;
    await connectMock();
    return;
  }
  try {
    await invoke('rescan');
  }
  catch (e) {
    error.value = String(e);
  }
}

export function useDiscovery() {
  init();

  return {
    services: computed(() => [...services.value.values()]),
    types: readonly(types),
    startedAt: readonly(startedAt),
    lastActivity: readonly(lastActivity),
    ready: readonly(ready),
    error: readonly(error),
    rescan,
  };
}
