import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MoreByAuthor } from "@/components/recipes/more-by-author";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { CoverEditor } from "@/components/recipes/cover-editor";
import { DraftReview } from "@/components/recipes/draft-review";
import { RecipeBackButton, RecipeShareButton } from "@/components/recipes/hero-controls";
import { IngredientsSection } from "@/components/recipes/ingredients-section";
import { PlatformIcon } from "@/components/recipes/platform-icon";
import { ActionPills, FavoriteButton, ReactionProvider } from "@/components/recipes/reaction-bar";
import { ReadyAt } from "@/components/recipes/ready-at";
import { RecipeBottomBar, ServingsProvider, ServingsStepper } from "@/components/recipes/servings";
import { RecipeVideoProvider, VideoEmbed, VideoPlayButton } from "@/components/recipes/video-embed";
import { Icon } from "@/components/ui/icon";
import { requireReadyMembership } from "@/lib/auth";
import { householdPortions } from "@/lib/household/portions";
import { getPlacementWeeks } from "@/lib/plan/queries";
import { todayInBogota } from "@/lib/plan/week";
import { recipeImageUrl } from "@/lib/recipes/images";
import { MEAL_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/recipes/labels";
import { getPlanMealAdjustments, getRecipe, getRecipeSocial, listRecipesByAuthor } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Receta" };

export default function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  return (
    <main className="flex flex-1 flex-col bg-canvas text-ink [--focus:var(--color-ink)] [&_:focus-visible]:outline-ink">
      <Suspense fallback={<PanLoaderScreen />}>
        <RecipeContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RecipeContent({ params, searchParams }: Pick<PageProps<"/recipes/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const planMealId = typeof query.meal === "string" && /^[0-9a-f-]{36}$/.test(query.meal) ? query.meal : null;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { household, member } = await requireReadyMembership();
  // Private cached membership can resolve during prerender; read the clock at request time.
  await connection();
  const today = todayInBogota();
  const [detail, social, planMeal, weeks] = await Promise.all([
    getRecipe(id, household.id),
    getRecipeSocial(id, member.id),
    planMealId ? getPlanMealAdjustments(planMealId) : null,
    getPlacementWeeks(household.id, today),
  ]);
  if (!detail) notFound();
  const { recipe, ingredients, steps, coverPath, hasCustomCover } = detail;
  const isOwnDraft = recipe.status === "pending_review" && recipe.imported_by_household_id === household.id;
  const removed = new Set(planMeal?.removed.map((r) => r.ingredientId) ?? []);
  const cookHref = !isOwnDraft && steps.length ? `/recipes/${recipe.id}/cook${planMealId ? `?meal=${planMealId}` : ""}` : null;
  const servings = householdPortions({ adults: household.servings_adults, kids: household.servings_kids });
  const hasVideo = Boolean(recipe.source_video_id && recipe.source_platform !== "manual");
  const moreByAuthor = recipe.author_name ? await listRecipesByAuthor(recipe.author_name, recipe.id, member.id) : [];

  return (
    <ServingsProvider key={recipe.id} initialServings={servings}>
      <RecipeVideoProvider>
        <ReactionProvider recipeId={recipe.id} mine={social.mine} likes={social.likes}>
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-canvas">
            <VideoEmbed platform={recipe.source_platform} videoId={recipe.source_video_id} coverUrl={recipeImageUrl(coverPath)} title={recipe.title} />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-safe">
              <RecipeBackButton />
              <div className="flex items-center gap-2">
                <CoverEditor recipeId={recipe.id} householdId={household.id} hasCustomCover={hasCustomCover} />
                <RecipeShareButton title={recipe.title} />
                {recipe.status === "approved" ? <FavoriteButton /> : null}
              </div>
            </div>
            {hasVideo ? <div className="absolute bottom-3 left-3"><VideoPlayButton dark /></div> : null}
          </div>

          <article className={`flex flex-1 flex-col gap-7 px-5 pt-6 ${isOwnDraft ? "pb-72" : "pb-36"}`}>
            <header className="flex flex-col gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                {recipe.meal_types.map((meal) => MEAL_TYPE_LABELS[meal]).join(" · ")}
                {isOwnDraft ? <span>{recipe.meal_types.length ? " · " : ""}Por confirmar</span> : null}
              </p>
              <h1 className="font-display text-[30px] leading-[1.1]">{recipe.title}</h1>
              {recipe.author_name ? <a href={recipe.source_url ?? recipe.author_url ?? "#"} target="_blank" rel="noopener noreferrer" className="link-text flex w-fit flex-wrap items-center gap-1.5 text-[13px]">
                <PlatformIcon platform={recipe.source_platform} size={17} />
                <span className="font-bold">{recipe.author_handle ?? recipe.author_name}</span>
                <span className="text-ink-muted">en {PLATFORM_LABELS[recipe.source_platform]}</span>
                <Icon name="arrow-right" size={15} />
              </a> : null}
            </header>

            {recipe.status === "approved" ? <ActionPills recipeId={recipe.id} mealTypes={recipe.meal_types} weeks={weeks} today={today} /> : null}
            {social.partner?.favorite ? <p className="-mt-3 flex items-center gap-2 text-sm text-ink-muted"><Icon name="heart" size={16} className="text-ink" /> A {social.partner.name} le encanta</p> : null}

            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-4 border-y border-line py-4">
                <Stat label="Tiempo" value={recipe.total_minutes ? `${recipe.total_minutes} min` : "—"} />
                <Stat label="Ingredientes" value={ingredients.length} />
                <Stat label="Calorías" value={recipe.kcal_per_serving ?? "—"} />
                <Stat label="Listo a las" value={<ReadyAt minutes={recipe.total_minutes} />} />
              </dl>
              {recipe.protein_g !== null ? <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                <span>Proteína <strong className="text-ink tabular">{recipe.protein_g} g</strong></span>
                <span>Carbos <strong className="text-ink tabular">{recipe.carbs_g} g</strong></span>
                <span>Grasa <strong className="text-ink tabular">{recipe.fat_g} g</strong></span>
                {recipe.nutrition_estimated ? <span className="text-ink-faint">estimado por porción</span> : null}
              </p> : null}
            </div>

            {planMeal?.removed.length ? <section className="flex gap-3">
              <Icon name="alert" size={21} className="mt-0.5 shrink-0 text-ink" />
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-[16px]">Ajustes para su plan</h2>
                {planMeal.removed.map((adjustment) => <p key={adjustment.ingredientId} className="text-sm text-ink-muted">
                  Sin <strong className="text-ink">{adjustment.ingredientName.toLowerCase()}</strong> ({adjustment.memberNames.join(" y ")})
                  {adjustment.substituteName ? <> · puedes usar {adjustment.substituteName.toLowerCase()}</> : null}
                </p>)}
              </div>
            </section> : null}

            <IngredientsSection baseServings={recipe.servings} editableRolesFor={recipe.imported_by_household_id === household.id ? recipe.id : undefined} ingredients={ingredients.map((ingredient) => ({
              position: ingredient.position,
              name: ingredient.ingredients?.name ?? "Ingrediente",
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              note: ingredient.note,
              accessory: ingredient.role === "accessory",
              removed: Boolean(ingredient.ingredients && removed.has(ingredient.ingredients.id)),
            }))} />

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[22px]">Pasos</h2>
                {hasVideo ? <VideoPlayButton /> : null}
              </div>
              <ol>
                {steps.map((step, index) => <li key={step.position} className="flex gap-4 border-b border-line py-5 last:border-b-0">
                  <span className="w-9 shrink-0 font-display text-[26px] leading-none text-ink-faint tabular">{String(index + 1).padStart(2, "0")}</span>
                  <div className="flex min-w-0 flex-col items-start gap-3">
                    <p className="text-[14.5px] leading-[1.5]">{step.text}</p>
                    {hasVideo && recipe.source_platform === "youtube" && step.video_start_seconds !== null ? <VideoPlayButton seconds={step.video_start_seconds} /> : null}
                  </div>
                </li>)}
              </ol>
            </section>

            <MoreByAuthor author={recipe.author_name} recipes={moreByAuthor} />
          </article>

          {isOwnDraft ? (
            <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pt-4 pb-safe">
              <div className="mb-3 flex justify-end"><ServingsStepper /></div>
              <DraftReview recipeId={recipe.id} initialMeals={recipe.meal_types} />
            </div>
          ) : <RecipeBottomBar cookHref={cookHref} />}
        </ReactionProvider>
      </RecipeVideoProvider>
    </ServingsProvider>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2 border-l border-line pl-2 first:border-l-0 first:pl-0">
    <dt className="text-[11px] text-ink-muted">{label}</dt>
    <dd className="font-display text-[18px] leading-none tabular">{value}</dd>
  </div>;
}
