export interface AvailabilityWindow {
  weekday: number; // 0=Sun..6=Sat
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Window covering the given date's weekday, or null. */
export function windowForDate(
  date: Date,
  windows: AvailabilityWindow[],
): AvailabilityWindow | null {
  return windows.find((w) => w.weekday === date.getDay()) ?? null;
}

/**
 * A start time is valid if it falls on a slot boundary within the day's
 * availability window and the whole slot fits before the window end.
 */
export function isValidSlotStart(start: Date, windows: AvailabilityWindow[]): boolean {
  const w = windowForDate(start, windows);
  if (!w) return false;
  const m = minutesOfDay(start);
  if (m < w.startMinute) return false;
  if (m + w.slotMinutes > w.endMinute) return false;
  return (m - w.startMinute) % w.slotMinutes === 0;
}

/** All slot start-minutes for a window (e.g. [600, 630, 660, ...]). */
export function slotStartsForWindow(w: AvailabilityWindow): number[] {
  const out: number[] = [];
  for (let m = w.startMinute; m + w.slotMinutes <= w.endMinute; m += w.slotMinutes) {
    out.push(m);
  }
  return out;
}
