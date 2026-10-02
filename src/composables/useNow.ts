import type { MaybeRefOrGetter } from 'vue';
import { useNow as useVueUseNow } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const now = useVueUseNow({ interval: 5000 });

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

export function relativeTime(timestamp: number, reference: number) {
  const elapsed = reference - timestamp;
  const sign = elapsed >= 0 ? -1 : 1;
  const seconds = Math.floor(Math.abs(elapsed) / SECOND);
  if (seconds < 10)
    return 'just now';
  if (seconds < 60)
    return rtf.format(sign * seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return rtf.format(sign * minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return rtf.format(sign * hours, 'hour');
  return rtf.format(sign * Math.floor(hours / 24), 'day');
}

export function useNow() {
  return now;
}

export function useRelativeTime(timestamp: MaybeRefOrGetter<number>) {
  const current = ref(Date.now());
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Wait until the label's next unit boundary, so fresh timestamps tick every second and old ones rarely.
  function nextDelay() {
    const diff = Math.abs(current.value - toValue(timestamp));
    const unit = diff < MINUTE ? SECOND : diff < HOUR ? MINUTE : diff < DAY ? HOUR : DAY;
    return unit - (diff % unit) || unit;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      current.value = Date.now();
      schedule();
    }, nextDelay());
  }

  watch(() => toValue(timestamp), () => {
    current.value = Date.now();
    schedule();
  }, { immediate: true });

  onScopeDispose(() => clearTimeout(timer));

  return computed(() => relativeTime(toValue(timestamp), current.value));
}
