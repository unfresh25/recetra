import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { listDiscover } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Descubre" };

export default function DiscoverPage() {
  return (
    <>
      <ScreenHeader
        title="Descubre"
        action={
          <Link href="/ask" aria-label="Preguntar a Mise" title="Preguntar" className="flex size-11 items-center justify-center text-ink">
            <Icon name="sparkles" size={24} />
          </Link>
        }
      />
      <div className="px-5 pt-4">
        <Suspense fallback={<PanLoaderScreen />}>
          <DiscoverRecipes />
        </Suspense>
      </div>
    </>
  );
}

async function DiscoverRecipes() {
  await requireReadyMembership();
  const recipes = await listDiscover();

  if (!recipes.length) {
    return <EmptyState illustration="empty-recipes" title="Pronto habrá más por descubrir" description="Aquí encontrarás recetas para inspirar tu próxima comida." />;
  }

  return (
    <ul className="divide-y divide-line" aria-label="Recetas para descubrir">
      {recipes.map((recipe) => <li key={recipe.id}><RecipeCard recipe={recipe} /></li>)}
    </ul>
  );
}
