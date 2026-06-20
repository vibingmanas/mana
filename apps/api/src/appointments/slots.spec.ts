import { describe, it, expect } from 'vitest';
import { isValidSlotStart, slotStartsForWindow, type AvailabilityWindow } from './slots';

// Mon-Fri 10:00-13:00, 30-min slots (weekday numbers per JS getDay()).
const windows: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startMinute: 600,
  endMinute: 780,
  slotMinutes: 30,
}));

// 2026-06-22 is a Monday.
function at(dateStr: string): Date {
  return new Date(dateStr);
}

describe('isValidSlotStart', () => {
  it('accepts an aligned slot inside the window', () => {
    expect(isValidSlotStart(at('2026-06-22T10:30:00'), windows)).toBe(true);
  });

  it('rejects a time before the window opens', () => {
    expect(isValidSlotStart(at('2026-06-22T09:30:00'), windows)).toBe(false);
  });

  it('rejects a slot that would run past closing', () => {
    expect(isValidSlotStart(at('2026-06-22T12:45:00'), windows)).toBe(false);
  });

  it('rejects an unaligned start', () => {
    expect(isValidSlotStart(at('2026-06-22T10:15:00'), windows)).toBe(false);
  });

  it('rejects a day with no availability (Sunday)', () => {
    expect(isValidSlotStart(at('2026-06-21T10:30:00'), windows)).toBe(false);
  });
});

describe('slotStartsForWindow', () => {
  it('generates aligned slot starts that fit', () => {
    expect(
      slotStartsForWindow({ weekday: 1, startMinute: 600, endMinute: 720, slotMinutes: 30 }),
    ).toEqual([600, 630, 660, 690]);
  });
});
