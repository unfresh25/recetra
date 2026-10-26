import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { CoverEditor } from "@/components/recipes/cover-editor";
import { DraftReview } from "@/components/recipes/draft-review";
import { IngredientsSection } from "@/components/recipes/ingredients-section";
import { PlatformIcon } from "@/components/recipes/platform-icon";
import { ActionPills, FavoriteButton, ReactionProvider } from "@/components/recipes/reaction-bar";
import { ReadyAt } from "@/components/recipes/ready-at";
import { VideoEmbed } from "@/components/recipes/video-embed";
import { Icon } from "@/components/ui/icon";
import { requireReadyMembership } from "@/lib/auth";
import { householdPortions } from "@/lib/household/portions";
import { recipeImageUrl } from "@/lib/recipes/images";
import { MEAL_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/recipes/labels";
import { getPlanMealAdjustments, getRecipe, getRecipeSocial } from "@/lib/recipes/queries";

export const metadata: Metadata = { title: "Receta" };

export default function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
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
  const [detail, social, planMeal] = await Promise.all([
    getRecipe(id, household.id),
    getRecipeSocial(id, member.id),
    planMealId ? getPlanMealAdjustments(planMealId) : null,
  ]);
  if (!detail) notFound();
  const { recipe, ingredients, steps, coverPath, hasCustomCover } = detail;
  const isOwnDraft = recipe.status === "pending_review" && recipe.imported_by_household_id === household.id;
  const removed = new Set(planMeal?.removed.map((r) => r.ingredientId) ?? []);
  const cookHref = !isOwnDraft && steps.length ? `/recipes/${recipe.id}/cook${planMealId ? `?meal=${planMealId}` : ""}` : null;
  const servings = householdPortions({ adults: household.servings_adults, kids: household.servings_kids });

  return (
    <ReactionProvider recipeId={recipe.id} mine={social.mine}>
      {/* Hero: media with the title over it (CREME) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink">
        <VideoEmbed
          platform={recipe.source_platform}
          videoId={recipe.source_video_id}
          coverUrl={recipeImageUrl(coverPath)}
          title={recipe.title}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-safe text-white">
          <Link href="/recipes" aria-label="Volver" className="flex size-11 items-center justify-center">
            <Icon name="arrow-left" size={26} />
          </Link>
          <div className="flex items-center">
            <CoverEditor recipeId={recipe.id} householdId={household.id} hasCustomCover={hasCustomCover} />
            {recipe.status === "approved" ? <FavoriteButton /> : null}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 px-5 pb-6 text-white">
          <p className="flex gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
            {recipe.meal_types.map((m) => (
              <span key={m}>{MEAL_TYPE_LABELS[m]}</span>
            ))}
            {isOwnDraft ? <span className="text-brand-soft">Por confirmar</span> : null}
          </p>
          <h1 className="font-condensed text-[44px] font-extrabold leading-[0.95] tracking-tight">{recipe.title}</h1>
          {recipe.author_name ? (
            <a
              href={recipe.source_url ?? recipe.author_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto flex w-fit items-center gap-2 text-[15px]"
            >
              <PlatformIcon platform={recipe.source_platform} size={18} />
              <span className="font-semibold">{recipe.author_handle ?? recipe.author_name}</span>
              <Icon name="arrow-right" size={16} />
              <span className="sr-only">en {PLATFORM_LABELS[recipe.source_platform]}</span>
            </a>
          ) : null}
        </div>
      </div>

      <article className="flex flex-1 flex-col gap-7 px-5 pt-5 pb-36">
        {recipe.status === "approved" ? <ActionPills cookHref={cookHref} /> : null}
        {social.partner?.favorite ? (
          <p className="-mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <Icon name="heart" size={16} className="text-brand" /> A {social.partner.name} le encanta
          </p>
        ) : null}

        {/* Stats row (CREME): Tiempo · Calorías · Porciones · Listo */}
        <dl className="grid grid-cols-4 border-y border-line py-4">
          <Stat label="Tiempo" value={recipe.total_minutes ? `${recipe.total_minutes} min` : "—"} />
          <Stat label="Calorías" value={recipe.kcal_per_serving ? `${recipe.kcal_per_serving}` : "—"} />
          <Stat label="Porciones" value={`${recipe.servings}`} />
          <Stat label="Listo" value={<ReadyAt minutes={recipe.total_minutes} />} />
        </dl>

        {recipe.protein_g !== null ? (
          <p className="-mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            <span>
              Proteína <strong className="text-ink tabular">{recipe.protein_g} g</strong>
            </span>
            <span>
              Carbohidratos <strong className="text-ink tabular">{recipe.carbs_g} g</strong>
            </span>
            <span>
              Grasa <strong className="text-ink tabular">{recipe.fat_g} g</strong>
            </span>
            {recipe.nutrition_estimated ? <span className="text-ink-faint">estimado por porción</span> : null}
          </p>
        ) : null}

        {planMeal?.removed.length ? (
          <section className="flex gap-3">
            <Icon name="alert" size={22} className="mt-0.5 shrink-0 text-teal" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Ajustes para su plan</p>
              {planMeal.removed.map((a) => (
                <p key={a.ingredientId} className="text-sm text-ink-muted">
                  Sin <strong className="text-ink">{a.ingredientName.toLowerCase()}</strong> ({a.memberNames.join(" y ")})
                  {a.substituteName ? <> · puedes usar {a.substituteName.toLowerCase()}</> : null}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        <IngredientsSection
          baseServings={recipe.servings}
          initialServings={servings}
          editableRolesFor={recipe.imported_by_household_id === household.id ? recipe.id : undefined}
          ingredients={ingredients.map((i) => ({
            position: i.position,
            name: i.ingredients?.name ?? "Ingrediente",
            quantity: i.quantity,
            unit: i.unit,
            note: i.note,
            accessory: i.role === "accessory",
            removed: Boolean(i.ingredients && removed.has(i.ingredients.id)),
          }))}
        />

        <section className="flex flex-col gap-4">
          <h2 className="font-condensed text-[30px] font-extrabold leading-none">Pasos</h2>
          <ol className="flex flex-col gap-5">
            {steps.map((step) => (
              <li key={step.position} className="flex gap-4">
                <span className="w-6 shrink-0 font-condensed text-2xl font-extrabold leading-7 text-brand tabular">
                  {step.position}
                </span>
                <p className="text-[16px] leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>

      {isOwnDraft ? (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pt-4 pb-safe">
          <DraftReview recipeId={recipe.id} initialMeals={recipe.meal_types} />
        </div>
      ) : null}
    </ReactionProvider>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-l border-line pl-3 first:border-l-0 first:pl-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-condensed text-[22px] font-extrabold leading-none tabular">{value}</dd>
    </div>
  );
}
