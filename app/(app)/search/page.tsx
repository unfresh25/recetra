import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { STYLE_OPTIONS } from "@/lib/onboarding/options";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import { searchRecipes } from "@/lib/recipes/queries";
import { parseRecipeSearchParams, recipeSearchParams, type RecipeSearch, type RecipeSearchFilters } from "@/lib/recipes/search-params";

export const metadata: Metadata = { title: "Buscar" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <ScreenHeader title="Buscar" />
      <div className="flex flex-col gap-5 px-5 pt-6">
        <Suspense fallback={<PanLoaderScreen />}><SearchContent searchParams={searchParams} /></Suspense>
      </div>
    </>
  );
}

async function SearchContent({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const search = parseRecipeSearchParams(await searchParams);
  await requireReadyMembership();
  const filters: { key: keyof RecipeSearchFilters; label: string }[] = [];
  if (search.style) filters.push({ key: "style", label: STYLE_OPTIONS.find((option) => option.value === search.style)!.label });
  if (search.meal) filters.push({ key: "meal", label: MEAL_TYPE_LABELS[search.meal] });
  if (search.max) filters.push({ key: "max", label: `Hasta ${search.max} min` });
  if (search.video) filters.push({ key: "video", label: "En video" });

  return (
    <>
      <form action="/search" method="get" role="search" className="flex items-center gap-3">
        {[...recipeSearchParams({ ...search, q: "" })].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <label htmlFor="recipe-search" className="sr-only">Nombre de receta</label>
        <input key={search.q} id="recipe-search" type="search" name="q" defaultValue={search.q} placeholder="Nombre de receta" className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 font-display text-[24px] leading-[30px] text-ink caret-ink shadow-none outline-none placeholder:text-ink-faint/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" />
        <button type="submit" aria-label="Buscar recetas" className="btn-ghost flex size-11 shrink-0 items-center justify-center text-ink"><Icon name="search" size={24} /></button>
      </form>
      {filters.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
          {filters.map(({ key, label }) => {
            const params = recipeSearchParams(search);
            params.delete(key);
            return <li key={key}><Link href={`/search${params.size ? `?${params}` : ""}`} aria-label={`Quitar filtro: ${label}`} className="btn-outline inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-3 font-display text-[12px] text-ink">{label}<Icon name="close" size={14} /></Link></li>;
          })}
        </ul>
      ) : null}
      {search.q || filters.length ? (
        <Suspense key={recipeSearchParams(search).toString()} fallback={<PanLoaderScreen />}><SearchResults search={search} /></Suspense>
      ) : <p className="text-[15px] text-ink-muted">Busca por nombre de receta</p>}
    </>
  );
}

async function SearchResults({ search }: { search: RecipeSearch }) {
  const { q, ...filters } = search;
  const recipes = await searchRecipes(q, filters);
  if (!recipes.length) {
    return <EmptyState illustration="empty-recipes" title={q ? `No encontramos recetas con “${q}”` : "No encontramos recetas con estos filtros"} description="Prueba con otro nombre o quita un filtro." />;
  }
  return <ul className="divide-y divide-line" aria-label="Resultados de búsqueda">{recipes.map((recipe) => <li key={recipe.id}><RecipeCard recipe={recipe} /></li>)}</ul>;
}
