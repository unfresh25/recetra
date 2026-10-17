import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CookMode } from "@/components/recipes/cook-mode";
import { requireReadyMembership } from "@/lib/auth";
import { formatQuantity } from "@/lib/recipes/labels";
import { getPlanMealAdjustments, getRecipe } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Cocinar" };

export default function CookPage({ params, searchParams }: PageProps<"/recipes/[id]/cook">) {
  return (
    <Suspense fallback={<main className="min-h-dvh flex-1 bg-surface" />}>
      <Cook params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Cook({ params, searchParams }: Pick<PageProps<"/recipes/[id]/cook">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const planMealId = typeof query.meal === "string" && /^[0-9a-f-]{36}$/.test(query.meal) ? query.meal : null;
  const { household } = await requireReadyMembership();
  const [detail, plan] = await Promise.all([getRecipe(id, household.id), planMealId ? getPlanMealAdjustments(planMealId) : null]);
  if (!detail || !detail.steps.length) notFound();
  const removed = new Set(plan?.removed.map((r) => r.ingredientId) ?? []);

  return (
    <CookMode
      recipeId={detail.recipe.id}
      title={detail.recipe.title}
      platform={detail.recipe.source_platform}
      videoId={detail.recipe.source_video_id}
      steps={detail.steps}
      planMealId={planMealId}
      ingredients={detail.ingredients.map((i) => ({
        name: i.ingredients?.name ?? "Ingrediente",
        aliases: i.ingredients?.aliases ?? [],
        amount: formatQuantity(i.quantity, i.unit),
        removed: Boolean(i.ingredients && removed.has(i.ingredients.id)),
      }))}
    />
  );
}
