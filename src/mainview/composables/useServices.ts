import type { Service } from 'bonjour-service';
import type { MyWebviewRPCType } from '../../shared/types';
import { Electroview } from 'electrobun/view';
import { groupBy } from 'lodash';
import { computed, ref } from 'vue';

const priorityOrder = ['http', 'https', 'smb'] as const;

function createPriorityComparator<T>(
  getKey: (item: T) => string,
  getFallback: (a: T, b: T) => number,
) {
  return (a: T, b: T) => {
    const aIndex = priorityOrder.indexOf(getKey(a) as typeof priorityOrder[number]);
    const bIndex = priorityOrder.indexOf(getKey(b) as typeof priorityOrder[number]);

    if (aIndex !== -1 && bIndex !== -1)
      return aIndex - bIndex;
    if (aIndex !== -1)
      return -1;
    if (bIndex !== -1)
      return 1;

    return getFallback(a, b);
  };
}

const sortKeyFunction = createPriorityComparator<string>(
  a => a,
  (a, b) => a.localeCompare(b),
);

const sortServicesFunction = createPriorityComparator<Service>(
  service => service.type,
  (a, b) => a.name.localeCompare(b.name),
);

export function useServices() {
  const servicesMap = ref<Map<string, Service>>(new Map());
  const filter = ref({
    search: '',
    types: [] as string[],
    showBy: 'type' as 'type' | 'name' | 'host' | 'protocol',
  });

  const rpc = Electroview.defineRPC<MyWebviewRPCType>({
    maxRequestTime: 5000,
    handlers: {
      messages: {
        service: ({ service }) => servicesMap.value.set(service.fqdn, service),
      },
    },
  });

  new Electroview({ rpc });

  const services = computed(() => [...servicesMap.value.values()]);

  const filteredServices = computed(() => (
    services.value.filter((service) => {
      const name = service.name.toLowerCase();
      const protocol = service.protocol.toLowerCase();
      const type = service.type.toLowerCase();

      const search = filter.value.search.toLowerCase();

      return (
        name.includes(search)
        || protocol.includes(search)
        || type.includes(search)
      );
    })),
  );

  const groupedServices = computed(() => groupBy(filteredServices.value, filter.value.showBy) as Record<string, Service[]>);

  const servicesByKey = computed(() => {
    const types = Object.keys(groupedServices.value) as Array<keyof typeof groupedServices.value>;

    return types.sort(sortKeyFunction).map(type => [type, groupedServices.value[type].sort(sortServicesFunction)] as const);
  });

  return {
    filter,
    servicesMap,
    services,
    servicesByKey,
  };
}
