import type { Metadata } from "next";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { MatchReview } from "@/components/shopping/match-review";
import { ShoppingHeader } from "@/components/shopping/shopping-header";
import { ShoppingEmpty } from "@/components/shopping/shopping-empty";
import { requireReadyMembership } from "@/lib/auth";
import { getShoppingPlan } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Revisar productos" };

export default function MatchReviewPage() {
  return <div className="[--focus:var(--color-ink)] [&_:focus-visible]:outline-ink">
    <Suspense fallback={<PanLoaderScreen />}><ShoppingHeader backHref="/shopping" title="Revisar productos" subtitle="No estamos seguros de estos. ¿Es lo que comprarías?" /></Suspense>
    <div className="flex flex-col px-5 pb-8"><Suspense fallback={<PanLoaderScreen />}><PendingMatches /></Suspense></div>
  </div>;
}

async function PendingMatches() {
  const { household } = await requireReadyMembership();
  const plan = await getShoppingPlan(household.id);
  if (!plan.hasPlan || !plan.pending.length) return <ShoppingEmpty title="Todo revisado" description="Cuando dudemos de un producto, aparecerá aquí." />;
  return <MatchReview pending={plan.pending} stores={plan.stores} />;
}
