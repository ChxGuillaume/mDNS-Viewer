<script setup lang="ts">
import type { Service } from 'bonjour-service';
import { computed } from 'vue';
import { useServiceModal } from '../composables/useServiceModal';

const props = defineProps<{ service: Service }>();

const serviceModal = useServiceModal();

const typeColor = computed(() => {
  const typeColors: Record<string, string> = {
    http: 'bg-green-500',
    https: 'bg-green-500',
    smb: 'bg-yellow-500',
  };
  return typeColors[props.service.type] ?? 'bg-gray-500';
});

function showDetails() {
  serviceModal.open(props.service);
}
</script>

<template>
  <UCard
    class="cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
    variant="soft"
    :ui="{ body: 'space-y-4 overflow-x-auto' }"
    @click="showDetails"
  >
    <h3 class="truncate">
      {{ service.name }}
    </h3>
    <div class="flex gap-2">
      <UBadge :class="typeColor">
        {{ service.type }}
      </UBadge>
      <UBadge v-if="service.protocol">
        {{ service.protocol }}
      </UBadge>
    </div>
  </UCard>
</template>

<style scoped>

</style>
