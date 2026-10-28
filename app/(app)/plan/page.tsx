import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { CompleteWeek } from "@/components/plan/complete-week";
import { MealCard } from "@/components/plan/meal-card";
import { ScrollToToday } from "@/components/plan/scroll-to-today";
import { WeekTabs } from "@/components/plan/week-tabs";
import { Icon } from "@/components/ui/icon";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { formatCop } from "@/lib/onboarding/options";
import { getPlanView } from "@/lib/plan/queries";
import { addDays, dayLabel, dayOfMonth, mondayOf } from "@/lib/plan/week";
import { MEAL_TYPES } from "@/lib/recipes/labels";
import { getShoppingPlan } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return <div className="[--focus:var(--color-ink)] [&_:focus-visible]:outline-ink">
    <ScreenHeader title="Plan" titleClassName="font-display text-[40px] leading-none" action={<Link href="/shopping" aria-label="Lista de compras" className="btn-ghost flex size-11 items-center justify-center text-ink"><Icon name="basket" size={24} /></Link>} />
    <div className="flex flex-col gap-6 px-5 pt-2 pb-8">
      <Suspense fallback={<PanLoaderScreen />}><WeekPlan searchParams={searchParams} /></Suspense>
    </div>
  </div>;
}

function weekRange(start: string) {
  const end = addDays(start, 6);
  const month = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" }).replace(".", "");
  return `${dayOfMonth(start)}${start.slice(5, 7) !== end.slice(5, 7) ? ` ${month(start)}` : ""} – ${dayOfMonth(end)} ${month(end)}`;
}

async function WeekPlan({ searchParams }: Pick<PageProps<"/plan">, "searchParams">) {
  const query = await searchParams;
  const { household } = await requireReadyMembership();
  const requested = [query.week, query.day].find((value) => z.iso.date().safeParse(value).success);
  const { today, weekStart, days, week, tabs } = await getPlanView(household.id, typeof requested === "string" ? requested : null);
  const thisWeek = mondayOf(today);
  const readOnly = weekStart < thisWeek;
  const planned = week?.meals.filter((meal) => meal.recipe).length ?? 0;
  const empty = !readOnly && days.some((day) => day >= today && MEAL_TYPES.some((type) => !week?.meals.some((meal) => meal.day === day && meal.mealType === type && (meal.recipe || meal.status === "cooked"))));
  const longToday = new Date(`${today}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return <>
    <p className="text-[14px] text-ink-muted first-letter:uppercase">{longToday}</p>
    <WeekTabs weekStart={weekStart} tabs={tabs.map((start) => ({ start, range: weekRange(start), label: start === thisWeek ? "Esta semana" : start === addDays(thisWeek, 7) ? "Próxima" : start === addDays(thisWeek, -7) ? "Pasada" : weekRange(start) }))} />
    {planned === 0 && !readOnly ? <div className="flex flex-col items-center gap-3 border-t border-line py-5 text-center">
      <h2 className="max-w-64 font-display text-[32px] leading-[1.1]">Tu semana está en blanco</h2>
      <p className="max-w-80 text-[14px] leading-relaxed text-ink-muted">Agrega las recetas que quieras desde Buscar, o deja que Mise complete los espacios por ti.</p>
      <div aria-hidden="true" className="flex gap-3">{MEAL_TYPES.map((meal) => <span key={meal} className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-ink-faint/40"><Icon name="add" size={20} className="text-ink-faint" /></span>)}</div>
      <CompleteWeek key={weekStart} weekStart={weekStart} hero />
      <Link href="/search" className="btn-outline inline-flex h-12 items-center justify-center rounded-full border border-line px-6 font-display text-[15px]">Buscar recetas</Link>
    </div> : <div className="flex items-start justify-between gap-2 border-y border-line py-4">
      <div className="min-w-0 self-center text-[12px] text-ink-muted">
        <p className="whitespace-nowrap"><span className="font-semibold text-ink">{planned} de 21</span> comidas</p>
        {weekStart === thisWeek ? <Suspense fallback={null}><WeekCost householdId={household.id} budgetCop={household.weekly_budget_cop} /></Suspense> : null}
      </div>
      {empty ? <CompleteWeek key={weekStart} weekStart={weekStart} /> : null}
    </div>}
    <ScrollToToday today={today} enabled={planned > 0 && weekStart === thisWeek} />
    <div className="flex flex-col gap-8">
      {days.filter((day) => !(weekStart === thisWeek && day < today && !week?.meals.some((meal) => meal.day === day && meal.recipe))).map((day) => <section key={day} id={`plan-${day}`} aria-labelledby={`heading-${day}`} className={`scroll-mt-5 ${weekStart === thisWeek && day < today ? "opacity-55" : ""}`}>
        <div className="mb-4 flex items-center gap-3">
          <h2 id={`heading-${day}`} className="font-display text-[30px] leading-none">{dayLabel(day)} <span className="tabular">{dayOfMonth(day)}</span></h2>
          {day === today ? <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold text-canvas">Hoy</span> : null}
        </div>
        <ul aria-label={`Comidas del ${dayLabel(day, "long").toLowerCase()} ${dayOfMonth(day)}`} className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MEAL_TYPES.map((mealType) => <MealCard key={mealType} day={day} mealType={mealType} meal={week?.meals.find((meal) => meal.day === day && meal.mealType === mealType)} members={week?.members ?? []} today={today} readOnly={readOnly} />)}
        </ul>
      </section>)}
    </div>
  </>;
}

async function WeekCost({ householdId, budgetCop }: { householdId: string; budgetCop: number | null }) {
  const plan = await getShoppingPlan(householdId);
  if (!plan.hasPlan) return null;
  const best = plan.bestCombo ?? plan.bestSingle;
  if (!best?.totalCop) return null;
  const over = budgetCop ? best.totalCop - budgetCop : 0;
  return <p className="tabular">~{formatCop(best.totalCop)} por comprar{budgetCop ? <span className={over > 0 ? "text-warning" : "text-ink-muted"}> · {over > 0 ? `${formatCop(over)} sobre el presupuesto` : `te sobran ${formatCop(-over)}`}</span> : null}</p>;
}
