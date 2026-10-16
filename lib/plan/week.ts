/** Dates are handled as plain ISO days in Colombia's timezone (UTC-5, no DST). */
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

export function todayInBogota(now = new Date()) {
  return new Date(now.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

export function mondayOf(isoDay: string) {
  const d = new Date(`${isoDay}T12:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - weekday);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDay: string, days: number) {
  const d = new Date(`${isoDay}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function dayLabel(isoDay: string, style: "short" | "long" = "short") {
  const weekday = (new Date(`${isoDay}T12:00:00Z`).getUTCDay() + 6) % 7;
  return (style === "short" ? SHORT : LONG)[weekday]!;
}

export function dayOfMonth(isoDay: string) {
  return Number(isoDay.slice(8, 10));
}
