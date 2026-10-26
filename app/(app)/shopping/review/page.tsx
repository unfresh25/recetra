import type { Metadata } from "next";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { MatchReview } from "@/components/shopping/match-review";
import { EmptyState } from "@/components/ui/empty-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { getShoppingPlan } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Revisar productos" };

export default function MatchReviewPage() {
  return (
    <>
      <ScreenHeader backHref="/shopping" title="Revisar productos" subtitle="No estamos seguros de estos. ¿Es lo que comprarías?" />
      <div className="flex flex-col px-5 pt-4">
        <Suspense fallback={<PanLoaderScreen />}>
          <PendingMatches />
        </Suspense>
      </div>
    </>
  );
}

async function PendingMatches() {
  const { household } = await requireReadyMembership();
  const plan = await getShoppingPlan(household.id);
  if (!plan.hasPlan || !plan.pending.length) {
    return <EmptyState illustration="empty-shopping" title="Todo revisado" description="Cuando dudemos de un producto, aparecerá aquí." />;
  }
  return <MatchReview pending={plan.pending} stores={plan.stores} />;
}
