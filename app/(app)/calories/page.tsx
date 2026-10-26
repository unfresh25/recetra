import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { DayStrip } from "@/components/plan/day-strip";
import { EatenToggle } from "@/components/plan/eaten-toggle";
import { WeekNav } from "@/components/plan/week-nav";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { getCalorieWeek } from "@/lib/calories/queries";
import { dayTotals, macroSplit, weekAverage } from "@/lib/calories/summary";
import { dayLabel, mondayOf } from "@/lib/plan/week";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Calorías" };

const kcal = new Intl.NumberFormat("es-CO");

export default function CaloriesPage({ searchParams }: PageProps<"/calories">) {
  return (
    <>
      <ScreenHeader title="Calorías" />
      <div className="flex flex-col gap-5 px-5 pt-4">
        <Suspense fallback={<PanLoaderScreen />}>
          <CalorieLog searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function CalorieLog({ searchParams }: Pick<PageProps<"/calories">, "searchParams">) {
  const query = await searchParams;
  const requested = typeof query.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.day) ? query.day : null;
  const { household } = await requireReadyMembership();
  const { today, days, selected, meals } = await getCalorieWeek(household.id, requested);
  const totals = dayTotals(meals, selected);
  const week = days.map((d) => dayTotals(meals, d));
  const average = weekAverage(week);
  const split = macroSplit(totals);
  const peak = Math.max(...week.map((d) => Math.max(d.kcal, d.plannedKcal)), 1);
  const ofDay = meals.filter((m) => m.day === selected);

  return (
    <>
      <WeekNav weekStart={days[0]!} today={today} basePath="/calories" maxAhead={0} />
      {days[0] !== mondayOf(today) ? (
        <Link href="/calories" scroll={false} className="-mt-3 self-center text-sm font-semibold text-brand">
          Volver a esta semana
        </Link>
      ) : null}
      <DayStrip days={days} selected={selected} today={today} basePath="/calories" />

      <section aria-label="Total del día" className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">
          {dayLabel(selected, "long")} · por persona · {totals.eaten} de {totals.planned} comidas
        </p>
        <p className="font-condensed text-[64px] font-extrabold leading-none tracking-tight tabular">
          {kcal.format(totals.kcal)}
          <span className="ml-2 font-display text-xl font-bold text-ink-muted">kcal</span>
        </p>
        {totals.planned > totals.eaten && selected >= today ? (
          <p className="text-sm text-ink-muted">Con lo que falta del plan: {kcal.format(totals.plannedKcal)} kcal</p>
        ) : null}
      </section>

      {split ? (
        <section aria-label="Macros" className="flex flex-col gap-2">
          <div className="flex h-3 overflow-hidden rounded-full">
            <span className="bg-coral" style={{ width: `${split.protein * 100}%` }} />
            <span className="bg-teal" style={{ width: `${split.carbs * 100}%` }} />
            <span className="bg-ink-faint" style={{ width: `${split.fat * 100}%` }} />
          </div>
          <div className="flex justify-between text-sm tabular">
            <span><span className="font-bold text-coral">{totals.protein} g</span> proteína</span>
            <span><span className="font-bold text-teal">{totals.carbs} g</span> carbohidratos</span>
            <span><span className="font-bold text-ink-muted">{totals.fat} g</span> grasa</span>
          </div>
        </section>
      ) : null}

      <ul className="divide-y divide-line" aria-label="Comidas del día">
        {ofDay.length ? (
          ofDay.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{MEAL_TYPE_LABELS[m.mealType]}</span>
                <span className={cn("block truncate font-semibold", !m.eaten && "text-ink-muted")}>{m.title}</span>
                {selected <= today ? <EatenToggle planMealId={m.id} eaten={m.eaten} /> : null}
              </span>
              <span className={cn("shrink-0 font-display font-bold tabular", !m.eaten && "text-ink-faint")}>{m.kcal ? `${kcal.format(m.kcal)} kcal` : "—"}</span>
            </li>
          ))
        ) : (
          <li className="py-6 text-center text-[15px] text-ink-muted">No hay comidas planeadas este día.</li>
        )}
      </ul>

      <section aria-label="Semana" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">La semana</h2>
          {average ? <span className="text-sm text-ink-muted tabular">Promedio {kcal.format(average)} kcal/día</span> : null}
        </div>
        <div className="flex items-end gap-2">
          {week.map((d) => (
            <Link key={d.day} href={`/calories?day=${d.day}`} scroll={false} className="flex flex-1 flex-col items-center gap-1" aria-label={`${dayLabel(d.day, "long")}: ${d.kcal} kcal`}>
              <span className="relative flex h-24 w-full items-end justify-center">
                <span className="absolute bottom-0 w-full rounded-t-lg bg-sunken" style={{ height: `${(d.plannedKcal / peak) * 100}%` }} />
                <span className={cn("relative w-full rounded-t-lg", d.day === selected ? "bg-brand" : "bg-savings")} style={{ height: `${(d.kcal / peak) * 100}%` }} />
              </span>
              <span className={cn("text-xs font-semibold", d.day === selected ? "text-brand" : "text-ink-muted")}>{dayLabel(d.day)}</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 pb-4 text-sm text-ink-muted">
        <Icon name="camera" size={16} className="mt-0.5 shrink-0" />
        Pronto podrás sumar con una foto lo que comas fuera del plan.
      </p>
    </>
  );
}
