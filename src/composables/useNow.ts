import { useNow as useVueUseNow } from '@vueuse/core';

const now = useVueUseNow({ interval: 5000 });

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

export function relativeTime(timestamp: number, reference: number) {
  const seconds = Math.round((timestamp - reference) / 1000);
  if (Math.abs(seconds) < 10)
    return 'just now';
  if (Math.abs(seconds) < 60)
    return rtf.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60)
    return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24)
    return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

export function useNow() {
  return now;
}
