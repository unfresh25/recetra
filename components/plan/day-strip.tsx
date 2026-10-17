import Link from "next/link";
import { DrawablyCircle } from "@/components/ui/drawably";
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
                className="flex h-20 w-12 flex-col items-center justify-center gap-1.5"
              >
                <span className={cn("text-xs font-semibold", active ? "text-brand" : "text-ink-muted")}>{dayLabel(day)}</span>
                {active ? (
                  <DrawablyCircle stroke="var(--color-brand)" width={2.5} className="px-1.5 py-1 font-condensed text-2xl font-extrabold leading-none text-brand tabular">
                    {dayOfMonth(day)}
                  </DrawablyCircle>
                ) : (
                  <span className="font-condensed text-2xl font-extrabold tabular">{dayOfMonth(day)}</span>
                )}
                {day === today && !active ? <span className="size-1 rounded-full bg-brand" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
