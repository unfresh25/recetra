import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { addDays, dayOfMonth, mondayOf } from "@/lib/plan/week";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const month = (day: string) => MONTHS[Number(day.slice(5, 7)) - 1];

/** How far ahead you can plan. Past weeks stay browsable without limit. */
export const MAX_WEEKS_AHEAD = 3;

export function weekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  return month(weekStart) === month(end)
    ? `${dayOfMonth(weekStart)}–${dayOfMonth(end)} ${month(end)}`
    : `${dayOfMonth(weekStart)} ${month(weekStart)} – ${dayOfMonth(end)} ${month(end)}`;
}

/** ‹ Esta semana · 12–18 oct › */
export function WeekNav({ weekStart, today, basePath = "/plan", maxAhead = MAX_WEEKS_AHEAD }: { weekStart: string; today: string; basePath?: string; maxAhead?: number }) {
  const current = mondayOf(today);
  const offset = Math.round((Date.parse(weekStart) - Date.parse(current)) / (7 * 86_400_000));
  const label = offset === 0 ? "Esta semana" : offset === -1 ? "Semana pasada" : offset === 1 ? "Próxima semana" : offset < 0 ? `Hace ${-offset} semanas` : `En ${offset} semanas`;
  const arrow = "flex size-11 items-center justify-center text-ink";
  return (
    <nav aria-label="Semanas" className="-mx-2 flex items-center justify-between">
      <Link href={`${basePath}?day=${addDays(weekStart, -7)}`} scroll={false} aria-label="Semana anterior" className={arrow}>
        <Icon name="arrow-left" size={22} />
      </Link>
      <div className="flex flex-col items-center">
        <span className="font-display font-bold">{label}</span>
        <span className="text-sm text-ink-muted tabular">{weekRange(weekStart)}</span>
      </div>
      {offset < maxAhead ? (
        <Link href={`${basePath}?day=${addDays(weekStart, 7)}`} scroll={false} aria-label="Semana siguiente" className={arrow}>
          <Icon name="arrow-right" size={22} />
        </Link>
      ) : (
        <span className="size-11" />
      )}
    </nav>
  );
}
