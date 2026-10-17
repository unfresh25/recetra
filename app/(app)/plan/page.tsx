import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DayStrip } from "@/components/plan/day-strip";
import { GenerateWeek } from "@/components/plan/generate-week";
import { DayRoute } from "@/components/plan/day-route";
import { RegenerateButton } from "@/components/plan/regenerate-button";
import { WeekNav } from "@/components/plan/week-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { formatCop } from "@/lib/onboarding/options";
import { getPlanView } from "@/lib/plan/queries";
import { dayLabel, mondayOf } from "@/lib/plan/week";
import { getShoppingPlan } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return (
    <>
      <ScreenHeader title="Plan" />
      <div className="flex flex-col gap-5 px-5 pt-4">
        <Suspense fallback={<PlanSkeleton />}>
          <WeekPlan searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

function PlanSkeleton() {
  return (
    <>
      <Card className="h-24 animate-pulse" />
      <div className="flex gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="h-16 w-14 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <Card className="h-28 animate-pulse" />
      <Card className="h-28 animate-pulse" />
    </>
  );
}

async function WeekPlan({ searchParams }: Pick<PageProps<"/plan">, "searchParams">) {
  const query = await searchParams;
  const { household } = await requireReadyMembership();
  const requested = typeof query.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.day) ? query.day : null;
  const { today, days, selected, week } = await getPlanView(household.id, requested);
  const weekStart = days[0]!;
  const thisWeek = mondayOf(today);
  const nav = (
    <>
      <WeekNav weekStart={weekStart} today={today} />
      {weekStart !== thisWeek ? (
        <Link href="/plan" scroll={false} className="-mt-3 self-center text-sm font-semibold text-brand">
          Volver a esta semana
        </Link>
      ) : null}
    </>
  );
  if (!week) {
    if (weekStart < thisWeek) {
      return (
        <>
          {nav}
          <EmptyState illustration="empty-plan" title="Sin plan esa semana" description="Recetra empezó a planear después. Las semanas con plan quedan aquí como registro." />
        </>
      );
    }
    // The current week builds itself on the first visit; future weeks wait for a tap.
    return (
      <>
        {nav}
        <GenerateWeek day={selected} auto={weekStart === thisWeek} />
      </>
    );
  }

  const dayMeals = week.meals.filter((m) => m.day === selected);
  const planned = week.meals.filter((m) => m.recipe).length;

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ink-muted">{household.name}</p>
            <p className="font-display text-xl font-bold">
              {planned} de {week.meals.length} comidas
            </p>
          </div>
          {weekStart >= thisWeek ? <RegenerateButton day={selected} /> : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="flex items-center gap-1.5"><Icon name="users" size={16} /> {household.servings_adults + household.servings_kids} personas</span>
          {household.weekly_budget_cop ? <span className="flex items-center gap-1.5"><Icon name="wallet" size={16} /> {formatCop(household.weekly_budget_cop)}</span> : null}
        </div>
        {weekStart === thisWeek ? (
          <Suspense fallback={<span className="h-5 w-48 animate-pulse rounded-full bg-sunken" />}>
            <WeekCost householdId={household.id} budgetCop={household.weekly_budget_cop} />
          </Suspense>
        ) : null}
        <Link href="/shopping" className="flex items-center justify-between border-t border-line pt-3 text-sm font-semibold">
          <span className="flex items-center gap-2"><Icon name="basket" size={18} /> Lista de compras y precios</span>
          <Icon name="arrow-right" size={16} className="text-ink-faint" />
        </Link>
      </Card>

      {nav}
      <DayStrip days={days} selected={selected} today={today} />

      <h2 className="font-condensed text-[34px] font-extrabold leading-none">{dayLabel(selected, "long")}</h2>
      <DayRoute meals={dayMeals} members={week.members} today={today} />
    </>
  );
}

/** What is left to buy this week, at the cheapest way to shop, against the budget. */
async function WeekCost({ householdId, budgetCop }: { householdId: string; budgetCop: number | null }) {
  const plan = await getShoppingPlan(householdId);
  if (!plan.hasPlan) return null;
  const best = plan.bestCombo ?? plan.bestSingle;
  if (!best || !best.totalCop) return null;
  const over = budgetCop ? best.totalCop - budgetCop : 0;
  return (
    <p className="text-[15px]">
      <span className="font-display font-bold tabular">Por comprar ~{formatCop(best.totalCop)}</span>
      {budgetCop ? (
        <span className={over > 0 ? "text-warning" : "text-savings"}>
          {" · "}
          {over > 0 ? `${formatCop(over)} sobre el presupuesto` : `te sobran ${formatCop(-over)}`}
        </span>
      ) : null}
    </p>
  );
}
