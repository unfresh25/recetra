import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LikeButton } from "@/components/recipes/like-button";
import { EmptyState } from "@/components/ui/empty-state";
import type { getDiscover, DiscoverRecipe } from "@/lib/discover/queries";
import { STYLE_OPTIONS, type RecipeStyle } from "@/lib/onboarding/options";
import { MEAL_TYPE_LABELS } from "@/lib/recipes/labels";
import { RecipePhoto } from "./recipe-photo";
import { RecipeTile } from "./recipe-tile";

type DiscoverData = Awaited<ReturnType<typeof getDiscover>>;

function Section({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[20px] font-semibold leading-tight">{title}</h2>
        {href ? <Link href={href} className="link-text shrink-0 text-[13px]">Ver todas</Link> : null}
      </div>
      {children}
    </section>
  );
}

function Rail({ recipes, quick = false, styles }: { recipes: DiscoverRecipe[]; quick?: boolean; styles?: RecipeStyle[] }) {
  return (
    <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {recipes.map((recipe) => <li key={recipe.id} className="w-[148px] shrink-0 snap-start"><RecipeTile recipe={recipe} layout={quick ? "quick" : "rail"} styles={styles} /></li>)}
    </ul>
  );
}

function DiscoverChips() {
  const chips = [
    { value: "quick", label: "En 20 min", href: "/search?max=20" },
    { value: "high_protein" },
    { value: "healthy" },
    { value: "one_pot", label: "Una olla" },
    { value: "family", label: "Familiar" },
    { value: "low_calorie" },
  ];
  return (
    <nav aria-label="Explorar recetas" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => {
        const option = STYLE_OPTIONS.find((style) => style.value === chip.value)!;
        return (
          <Link key={chip.value} href={chip.href ?? `/search?style=${chip.value}`} className="btn-outline flex h-9 shrink-0 items-center gap-2 rounded-full border border-line pr-3 pl-1 font-display text-[12px] font-medium">
            <Image src={option.image} alt="" width={26} height={26} sizes="26px" className="size-[26px] rounded-full object-cover" />
            {chip.label ?? option.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TodayPlan({ meals }: { meals: DiscoverData["todayPlan"] }) {
  return (
    <section className="flex flex-col gap-4" aria-label="Hoy en tu plan">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[20px] font-semibold">Hoy en tu plan</h2>
        <Link href="/plan" className="link-text text-[13px]">Ver plan</Link>
      </div>
      {meals ? (
        <ul className="grid grid-cols-3 gap-3">
          {meals.map(({ mealType, recipe }) => {
            const content = <>
              <RecipePhoto path={recipe?.coverPath ?? null} sizes="(max-width: 576px) calc((100vw - 64px) / 3), 165px" className="h-[92px] rounded-[14px]" />
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{MEAL_TYPE_LABELS[mealType]}</p>
              <p className="mt-1 line-clamp-2 font-display text-[13px] font-medium leading-snug">{recipe?.title ?? "Sin receta"}</p>
            </>;
            return <li key={mealType}>{recipe ? <Link className="link-tile block" href={`/recipes/${recipe.id}`}>{content}</Link> : <div>{content}</div>}</li>;
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
          <p className="text-ink-muted">Aún no tienes plan esta semana</p>
          <Link href="/plan" className="link-text">Armar mi semana</Link>
        </div>
      )}
    </section>
  );
}

export function DiscoverFeed({ data, styles }: { data: DiscoverData; styles: RecipeStyle[] }) {
  const daily = data.recipeOfTheDay;
  return (
    <div className="flex flex-col gap-8 px-5 pt-6 pb-8">
      {daily ? (
        <article className="relative">
          <Link href={`/recipes/${daily.id}`} className="link-tile block">
            <RecipePhoto path={daily.coverPath} sizes="(max-width: 576px) calc(100vw - 40px), 536px" className="aspect-[16/10] rounded-[22px]" hero />
            <p className="mt-4 text-[11px] font-bold tracking-[0.14em] text-[#4f9a34]">RECETA DEL DÍA</p>
            <h2 className="mt-2 font-display text-[25px] font-semibold leading-[1.15]">{daily.title}</h2>
            <p className="mt-2 text-[12px] text-ink-muted">{[daily.author_name, daily.total_minutes !== null ? `${daily.total_minutes} min` : null, daily.kcal_per_serving !== null ? `${daily.kcal_per_serving} kcal` : null].filter(Boolean).join(" · ")}</p>
          </Link>
          <div className="absolute top-3 right-3"><LikeButton recipeId={daily.id} recipeTitle={daily.title} likes={daily.likes} likedByMe={daily.likedByMe} /></div>
        </article>
      ) : <EmptyState illustration="empty-recipes" title="Pronto habrá más por descubrir" description="Aquí encontrarás recetas para inspirar tu próxima comida." />}
      <DiscoverChips />
      <TodayPlan meals={data.todayPlan} />
      {data.forYourStyle.length ? <Section title="Para tu estilo" href={styles[0] ? `/search?style=${styles[0]}` : undefined}><Rail recipes={data.forYourStyle} styles={styles} /></Section> : null}
      {data.videos.length ? <Section title="Recetas en video" href="/search?video=1"><ul className="grid grid-cols-2 gap-x-4 gap-y-6">{data.videos.map((recipe) => <li key={recipe.id}><RecipeTile recipe={recipe} layout="video" /></li>)}</ul></Section> : null}
      {data.quick.length ? <Section title="Listas en 20 minutos" href="/search?max=20"><Rail recipes={data.quick} quick /></Section> : null}
      {data.houseFavorites.length ? <Section title="Favoritos de la casa" href="/recipes?tab=favorites"><Rail recipes={data.houseFavorites} /></Section> : null}
      {data.newest.length ? <Section title="Lo más nuevo"><ul className="grid grid-cols-2 gap-x-4 gap-y-6">{data.newest.map((recipe) => <li key={recipe.id}><RecipeTile recipe={recipe} layout="grid" /></li>)}</ul></Section> : null}
    </div>
  );
}
