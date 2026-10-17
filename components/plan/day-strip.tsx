import Link from "next/link";
import { dayLabel, dayOfMonth } from "@/lib/plan/week";
import { cn } from "@/lib/utils/cn";

export function DayStrip({ days, selected, today }: { days: string[]; selected: string; today: string }) {
  return (
    <nav aria-label="Días de la semana" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-2">
        {days.map((day) => {
          const active = day === selected;
          return (
            <li key={day}>
              <Link
                href={`/plan?day=${day}`}
                scroll={false}
                aria-current={active ? "date" : undefined}
                className={cn(
                  "flex h-16 w-14 flex-col items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-brand text-white" : "bg-surface",
                )}
              >
                <span className={cn("text-xs font-semibold", active ? "text-white/85" : "text-ink-muted")}>{dayLabel(day)}</span>
                <span className="font-display text-lg font-bold tabular">{dayOfMonth(day)}</span>
                {day === today && !active ? <span className="size-1 rounded-full bg-brand" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
