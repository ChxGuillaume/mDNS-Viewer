<script setup lang="ts">
import { ref } from 'vue';
import ServiceCard from './components/ServiceCard.vue';
import { useServices } from './composables/useServices';

const { filter, servicesByKey } = useServices();

const showByItems = ref([
  { label: 'Type', value: 'type' },
  { label: 'Name', value: 'name' },
  { label: 'Host', value: 'host' },
  { label: 'Protocol', value: 'protocol' },
]);
</script>

<template>
  <UApp>
    <UHeader title="" class="flex justify-end" :toggle="false">
      <template #left>
        <UInput v-model="filter.search" placeholder="Search..." class="w-64" autocomplete="off">
          <template v-if="filter.search?.length" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="i-lucide-circle-x"
              aria-label="Clear input"
              @click="filter.search = ''"
            />
          </template>
        </UInput>
      </template>
      <template #right>
        Show by:
        <USelect
          v-model="filter.showBy"
          :items="showByItems"
          class="w-42"
        />
      </template>
    </UHeader>

    <UMain class="py-4">
      <UContainer>
        <UEmpty v-if="!Object.keys(servicesByKey).length" title="No services found" icon="i-heroicons-inbox-stack" />
        <div class="gap-4 md:columns-2 lg:columns-3">
          <UCard
            v-for="[key, services] in servicesByKey"
            :key="key"
            class="break-inside-avoid"
            :ui="{ body: 'space-y-4' }"
          >
            <h2 class="truncate text-xl font-bold">
              {{ key }}
            </h2>
            <div class="flex flex-col gap-4">
              <ServiceCard
                v-for="service in services"
                :key="service.fqdn"
                :service="service"
              />
            </div>
          </UCard>
        </div>
      </UContainer>
    </UMain>
  </UApp>
</template>
