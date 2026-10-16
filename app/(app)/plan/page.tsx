import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { countInbox } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
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
      <div className="flex flex-col gap-4 px-5 pt-4">
        <Suspense fallback={<Card className="h-20 animate-pulse" />}>
          <Greeting />
        </Suspense>
        <EmptyState
          illustration="empty-plan"
          title="Tu plan semanal está en camino"
          description="Muy pronto verás aquí desayuno, almuerzo y cena para cada día."
        />
      </div>
    </>
  );
}

async function Greeting() {
  const { member, household } = await requireReadyMembership();
  return (
    <Card className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-ink-muted">{household.name}</p>
        <p className="font-display text-xl font-bold">Hola, {member.display_name} 👋</p>
      </div>
      <Link href="/profile" className="text-sm font-semibold text-brand">
        Ver hogar
      </Link>
    </Card>
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
      className="relative flex size-11 items-center justify-center rounded-full bg-surface shadow-card"
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
