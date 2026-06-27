'use client';

const KEY = 'mana.compare';
export const COMPARE_MAX = 4;
export const COMPARE_EVENT = 'mana:compare';

export function getCompare(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(COMPARE_EVENT));
}

export function toggleCompare(id: string): string[] {
  const ids = getCompare();
  const next = ids.includes(id)
    ? ids.filter((x) => x !== id)
    : ids.length >= COMPARE_MAX
      ? ids
      : [...ids, id];
  save(next);
  return next;
}

export function removeCompare(id: string): void {
  save(getCompare().filter((x) => x !== id));
}

export function clearCompare(): void {
  save([]);
}
