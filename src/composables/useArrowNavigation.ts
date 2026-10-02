import type { MaybeRefOrGetter } from 'vue';
import type { ViewMode } from './useServiceBrowser';
import { useEventListener } from '@vueuse/core';
import { toValue } from 'vue';

const ITEM_SELECTOR = '[data-nav-item]';
const IGNORED_TARGETS = 'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="menu"], [role="listbox"], [role="slider"], [role="tablist"], [role="radiogroup"]';
const ROW_TOLERANCE = 4;

type Direction = 'up' | 'down' | 'left' | 'right';

const keys: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

function centerX(rect: DOMRect) {
  return rect.left + rect.width / 2;
}

function closestInRow(candidates: { el: HTMLElement; rect: DOMRect }[], rowTop: number, x: number) {
  return candidates
    .filter(({ rect }) => Math.abs(rect.top - rowTop) <= ROW_TOLERANCE)
    .sort((a, b) => Math.abs(centerX(a.rect) - x) - Math.abs(centerX(b.rect) - x))[0]
    ?.el;
}

function findTarget(items: HTMLElement[], current: HTMLElement | undefined, direction: Direction, view: ViewMode) {
  if (!current)
    return direction === 'up' || direction === 'left' ? items.at(-1) : items[0];

  if (direction === 'left' || direction === 'right') {
    if (view !== 'grid')
      return undefined;
    return items[items.indexOf(current) + (direction === 'right' ? 1 : -1)];
  }

  const origin = current.getBoundingClientRect();
  const measured = items.filter(el => el !== current).map(el => ({ el, rect: el.getBoundingClientRect() }));

  if (direction === 'down') {
    const below = measured.filter(({ rect }) => rect.top >= origin.bottom - ROW_TOLERANCE);
    if (!below.length)
      return undefined;
    return closestInRow(below, Math.min(...below.map(({ rect }) => rect.top)), centerX(origin));
  }

  const above = measured.filter(({ rect }) => rect.bottom <= origin.top + ROW_TOLERANCE);
  if (!above.length)
    return undefined;
  const rowTop = Math.max(...above.map(({ rect }) => rect.top));
  return closestInRow(above, rowTop, centerX(origin));
}

export function useArrowNavigation(options: {
  view: MaybeRefOrGetter<ViewMode>;
  selectedId: MaybeRefOrGetter<string | undefined>;
  onSelect: (id: string) => void;
}) {
  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    const direction = keys[event.key];
    if (!direction || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (event.target instanceof Element && event.target.closest(IGNORED_TARGETS))
      return;

    const items = [...document.querySelectorAll<HTMLElement>(ITEM_SELECTOR)];
    if (!items.length)
      return;

    const active = document.activeElement instanceof HTMLElement && document.activeElement.matches(ITEM_SELECTOR)
      ? document.activeElement
      : undefined;
    const selectedId = toValue(options.selectedId);
    const current = active ?? items.find(el => el.dataset.serviceId === selectedId);

    const target = findTarget(items, current, direction, toValue(options.view));
    if (!target?.dataset.serviceId)
      return;

    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest' });
    options.onSelect(target.dataset.serviceId);
  });
}
