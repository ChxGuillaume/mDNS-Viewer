<script setup lang="ts">
import type { Service } from 'bonjour-service';
import FullTextSelect from './FullTextSelect.vue';
import LabeledValue from './LabeledValue.vue';

defineProps<{ service: Service }>();
</script>

<template>
  <UModal :title="service.name">
    <template #body>
      <div class="space-y-4">
        <section>
          <h4 class="mb-1 text-sm font-semibold tracking-wider text-gray-500 uppercase">
            General Information
          </h4>
          <div class="grid grid-cols-[auto_1fr] gap-2 text-sm">
            <LabeledValue label="FQDN" :value="service.fqdn" />
            <LabeledValue label="Type" :value="service.type" />
            <LabeledValue label="Protocol" :value="service.protocol" />
            <LabeledValue label="Host" :value="service.host" />
            <LabeledValue label="Port" :value="service.port" />
          </div>
        </section>

        <section v-if="service.addresses && service.addresses.length > 0">
          <h4 class="mb-1 text-sm font-semibold tracking-wider text-gray-500 uppercase">
            Addresses
          </h4>
          <ul class="list-inside list-disc space-y-1 text-sm marker:text-gray-500">
            <li v-for="address in service.addresses" :key="address" class="font-mono">
              <FullTextSelect>{{ address }}</FullTextSelect>
            </li>
          </ul>
        </section>

        <section v-if="service.txt && Object.keys(service.txt).length > 0">
          <h4 class="mb-1 text-sm font-semibold tracking-wider text-gray-500 uppercase">
            TXT Records
          </h4>
          <div class="overflow-x-auto rounded p-2 font-mono text-xs outline-1 outline-gray-200 dark:outline-gray-800">
            <div v-for="(value, key) in service.txt" :key="key" class="flex gap-2">
              <span class="text-primary-500 font-bold">{{ key }}:</span>
              <span>{{ value }}</span>
            </div>
          </div>
        </section>

        <section v-if="service.subtypes && service.subtypes.length > 0">
          <h4 class="mb-1 text-sm font-semibold tracking-wider text-gray-500 uppercase">
            Subtypes
          </h4>
          <div class="flex flex-wrap gap-1">
            <UBadge v-for="subtype in service.subtypes" :key="subtype" size="xs" variant="soft">
              {{ subtype }}
            </UBadge>
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>
