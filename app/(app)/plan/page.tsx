import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <>
      <ScreenHeader
        title="Plan"
        action={
          <span
            aria-label="Pendientes por confirmar"
            className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card"
          >
            <Icon name="bell" />
          </span>
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
