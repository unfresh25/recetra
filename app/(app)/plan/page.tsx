import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DayStrip } from "@/components/plan/day-strip";
import { GenerateWeek } from "@/components/plan/generate-week";
import { MealCard } from "@/components/plan/meal-card";
import { RegenerateButton } from "@/components/plan/regenerate-button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { formatCop } from "@/lib/onboarding/options";
import { getPlanView } from "@/lib/plan/queries";
import { dayLabel } from "@/lib/plan/week";
import { countInbox } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage({ searchParams }: PageProps<"/plan">) {
  return (
    <>
      <ScreenHeader
        title="Plan"
        action={
          <Suspense fallback={<InboxBell count={0} />}>
            <InboxBellCount />
          </Suspense>
        }
      />
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
  if (!week) return <GenerateWeek day={selected} />;

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
          <RegenerateButton day={selected} />
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="flex items-center gap-1.5"><Icon name="users" size={16} /> {household.servings_adults + household.servings_kids} personas</span>
          {household.weekly_budget_cop ? <span className="flex items-center gap-1.5"><Icon name="wallet" size={16} /> {formatCop(household.weekly_budget_cop)}</span> : null}
        </div>
        <Link href="/shopping" className="flex items-center justify-between rounded-field bg-sunken/70 px-4 py-3 text-sm font-semibold">
          <span className="flex items-center gap-2"><Icon name="basket" size={18} /> Lista de compras y precios</span>
          <Icon name="arrow-right" size={16} className="text-ink-faint" />
        </Link>
      </Card>

      <DayStrip days={days} selected={selected} today={today} />

      <h2 className="font-display text-2xl font-extrabold">{dayLabel(selected, "long")}</h2>
      <div className="flex flex-col gap-5">
        {dayMeals.map((meal) => (
          <MealCard key={meal.id} meal={meal} members={week.members} />
        ))}
      </div>
    </>
  );
}

async function InboxBellCount() {
  const { household } = await requireReadyMembership();
  return <InboxBell count={await countInbox(household.id)} />;
}

function InboxBell({ count }: { count: number }) {
  return (
    <Link
      href="/inbox"
      aria-label={count ? `${count} pendientes por confirmar` : "Pendientes por confirmar"}
      className="relative flex size-11 items-center justify-center rounded-full bg-surface"
    >
      <Icon name="bell" />
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white tabular">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
