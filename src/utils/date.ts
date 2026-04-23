export function getWeekRange(): string {
  const now    = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** ISO week id, e.g. "2026-W13" */
export function getISOWeekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Monday of the given ISO week */
export function getWeekMonday(weekId: string): Date {
  const m = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return new Date();
  const jan4   = new Date(+m[1], 0, 4);
  const dow    = jan4.getDay() || 7;
  const w1Mon  = new Date(jan4);
  w1Mon.setDate(jan4.getDate() - dow + 1);
  const result = new Date(w1Mon);
  result.setDate(w1Mon.getDate() + (+m[2] - 1) * 7);
  return result;
}

/** Does the ISO week's Thursday fall in the given YYYY-MM month? */
export function weekInMonth(weekId: string, yearMonth: string): boolean {
  const mon = getWeekMonday(weekId);
  const thu = new Date(mon);
  thu.setDate(mon.getDate() + 3);
  return `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, '0')}` === yearMonth;
}
