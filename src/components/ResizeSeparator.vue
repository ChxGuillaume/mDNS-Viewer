<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ min: number; max: number; defaultSize: number; label?: string }>();
const size = defineModel<number>({ required: true });

const dragging = ref(false);
const clamp = (value: number) => Math.round(Math.min(props.max, Math.max(props.min, value)));

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0)
    return;
  const handle = event.currentTarget as HTMLElement;
  const startX = event.clientX;
  const startSize = size.value;
  handle.setPointerCapture(event.pointerId);
  dragging.value = true;

  const onMove = (e: PointerEvent) => {
    size.value = clamp(startSize - (e.clientX - startX));
  };
  const onUp = () => {
    dragging.value = false;
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
  };
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
}

function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 64 : 16;
  const actions: Record<string, () => number> = {
    ArrowLeft: () => size.value + step,
    ArrowRight: () => size.value - step,
    Home: () => props.max,
    End: () => props.min,
    Enter: () => props.defaultSize,
  };
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    size.value = clamp(action());
  }
}
</script>

<template>
  <div
    role="separator"
    aria-orientation="vertical"
    :aria-label="label ?? 'Resize panel'"
    :aria-valuenow="size"
    :aria-valuemin="min"
    :aria-valuemax="max"
    tabindex="0"
    :data-dragging="dragging || undefined"
    class="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none outline-none"
    @pointerdown="onPointerDown"
    @dblclick="size = defaultSize"
    @keydown="onKeydown"
  >
    <div
      class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-(--ui-border) transition-[width,background-color] duration-150 group-hover:w-0.5 group-hover:bg-primary/60 group-focus-visible:w-0.5 group-focus-visible:bg-primary group-data-dragging:w-0.5 group-data-dragging:bg-primary"
    />
  </div>
  <Teleport v-if="dragging" to="body">
    <div class="fixed inset-0 z-50 cursor-col-resize" />
  </Teleport>
</template>
