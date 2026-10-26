import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { searchRecipes } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Buscar" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <ScreenHeader title="Buscar" />
      <div className="flex flex-col gap-5 px-5 pt-6">
        <Suspense fallback={<PanLoaderScreen />}>
          <SearchContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function SearchContent({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  await requireReadyMembership();

  return (
    <>
      <form action="/search" method="get" role="search" className="flex items-center gap-3">
        <label htmlFor="recipe-search" className="sr-only">Nombre de receta</label>
        <input
          key={query}
          id="recipe-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nombre de receta"
          className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 font-display text-[24px] leading-[30px] text-ink caret-ink shadow-none outline-none placeholder:text-ink-faint/70"
        />
        <button type="submit" aria-label="Buscar recetas" className="flex size-11 shrink-0 items-center justify-center text-ink">
          <Icon name="search" size={24} />
        </button>
      </form>
      {query ? (
        <Suspense key={query} fallback={<PanLoaderScreen />}>
          <SearchResults query={query} />
        </Suspense>
      ) : (
        <p className="text-[15px] text-ink-muted">Busca por nombre de receta</p>
      )}
    </>
  );
}

async function SearchResults({ query }: { query: string }) {
  const recipes = await searchRecipes(query);

  if (!recipes.length) {
    return <EmptyState illustration="empty-recipes" title={`No encontramos recetas con “${query}”`} description="Prueba con otro nombre de receta." />;
  }

  return (
    <ul className="divide-y divide-line" aria-label="Resultados de búsqueda">
      {recipes.map((recipe) => <li key={recipe.id}><RecipeCard recipe={recipe} /></li>)}
    </ul>
  );
}
