import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CoverEditor } from "@/components/recipes/cover-editor";
import { IngredientRoleToggle } from "@/components/recipes/ingredient-role-toggle";
import { PlatformIcon } from "@/components/recipes/platform-icon";
import { VideoEmbed } from "@/components/recipes/video-embed";
import { Icon } from "@/components/ui/icon";
import { DraftReview } from "@/components/recipes/draft-review";
import { requireReadyMembership } from "@/lib/auth";
import { recipeImageUrl } from "@/lib/recipes/images";
import { MEAL_TYPE_LABELS, PLATFORM_LABELS, formatQuantity } from "@/lib/recipes/labels";
import { getPlanMealAdjustments, getRecipe, getRecipeSocial } from "@/lib/recipes/queries";
import { ReactionBar } from "@/components/recipes/reaction-bar";

export const metadata: Metadata = { title: "Receta" };

export default function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<div className="aspect-[4/5] w-full animate-pulse bg-sunken" />}>
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
  const canEditRoles = recipe.imported_by_household_id === household.id;

  return (
    <>
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <VideoEmbed
          platform={recipe.source_platform}
          videoId={recipe.source_video_id}
          coverUrl={recipeImageUrl(coverPath)}
          title={recipe.title}
        />
        <div className="absolute inset-x-0 top-0 flex justify-between px-5 pt-safe">
          <Link
            href="/recipes"
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-full bg-white/85 text-ink shadow-card backdrop-blur"
          >
            <Icon name="close" />
          </Link>
          <CoverEditor recipeId={recipe.id} householdId={household.id} hasCustomCover={hasCustomCover} />
        </div>
      </div>

      <article className="relative -mt-8 flex flex-1 flex-col gap-6 rounded-t-[28px] bg-surface px-5 pt-6 pb-36">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {recipe.meal_types.map((m) => (
              <span key={m} className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {MEAL_TYPE_LABELS[m]}
              </span>
            ))}
            {isOwnDraft ? (
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">Por confirmar</span>
            ) : null}
          </div>
          <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight">{recipe.title}</h1>
          {recipe.author_name ? (
            <a
              href={recipe.source_url ?? recipe.author_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-2 rounded-full bg-sunken py-1.5 pl-1.5 pr-3 text-sm"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-surface">
                <PlatformIcon platform={recipe.source_platform} size={15} />
              </span>
              <span>
                Por <span className="font-semibold">{recipe.author_handle ?? recipe.author_name}</span>
              </span>
              <span className="sr-only">en {PLATFORM_LABELS[recipe.source_platform]}</span>
            </a>
          ) : null}
          {recipe.status === "approved" ? <ReactionBar recipeId={recipe.id} mine={social.mine} partner={social.partner} /> : null}
        </header>

        {planMeal?.removed.length ? (
          <section className="flex flex-col gap-2 rounded-card bg-teal-soft/60 p-4">
            <p className="font-display font-bold">Ajustes para su plan</p>
            <ul className="flex flex-col gap-1 text-sm">
              {planMeal.removed.map((a) => (
                <li key={a.ingredientId}>
                  Sin <strong>{a.ingredientName.toLowerCase()}</strong> ({a.memberNames.join(" y ")})
                  {a.substituteName ? <> · puedes usar {a.substituteName.toLowerCase()}</> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <dl className="grid grid-cols-3 divide-x divide-line rounded-card border border-line py-4 text-center">
          <Stat emoji="⏱️" value={recipe.total_minutes ? `${recipe.total_minutes}` : "—"} label="minutos" />
          <Stat emoji="🔥" value={recipe.kcal_per_serving ? `${recipe.kcal_per_serving}` : "—"} label="kcal por porción" />
          <Stat emoji="🍽️" value={`${recipe.servings}`} label="porciones" />
        </dl>

        {recipe.protein_g !== null ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Macro label="Proteína" grams={recipe.protein_g} emoji="💪" />
            <Macro label="Carbohidratos" grams={recipe.carbs_g} emoji="🍞" />
            <Macro label="Grasa" grams={recipe.fat_g} emoji="🥑" />
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-bold">Ingredientes</h2>
          <ul className="flex flex-col divide-y divide-line">
            {ingredients.map((item) => (
              <li key={item.position} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.ingredients?.name ?? "Ingrediente"}</span>
                  <span className="block text-sm text-ink-muted">
                    {[formatQuantity(item.quantity, item.unit), item.note].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {canEditRoles ? (
                  <IngredientRoleToggle recipeId={recipe.id} position={item.position} role={item.role} />
                ) : item.role === "accessory" ? (
                  <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-semibold text-teal">Adorno</span>
                ) : null}
              </li>
            ))}
          </ul>
          {recipe.nutrition_estimated ? (
            <p className="text-xs text-ink-faint">Calorías y macros estimados a partir de los ingredientes.</p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-bold">Pasos</h2>
          <ol className="flex flex-col gap-4">
            {steps.map((step) => (
              <li key={step.position} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-white">
                  {step.position}
                </span>
                <p className="pt-0.5 text-[15px] leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>

      {isOwnDraft ? (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md rounded-t-[28px] bg-surface px-5 pt-4 pb-safe shadow-float">
          <DraftReview recipeId={recipe.id} initialMeals={recipe.meal_types} />
        </div>
      ) : steps.length ? (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md justify-center px-5 pb-safe">
          <Link
            href={`/recipes/${recipe.id}/cook${planMealId ? `?meal=${planMealId}` : ""}`}
            className="flex h-14 items-center gap-2 rounded-full bg-brand px-8 font-display text-[17px] font-bold text-white shadow-[0_6px_20px_rgb(232_32_42/0.35)] active:scale-[0.97]"
          >
            <Icon name="play" size={20} strokeWidth={2.4} /> Cocinar ahora
          </Link>
        </div>
      ) : null}
    </>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <dt className="sr-only">{label}</dt>
      <span aria-hidden className="text-lg">{emoji}</span>
      <dd className="font-display text-lg font-bold tabular">{value}</dd>
      <span aria-hidden className="text-[11px] leading-tight text-ink-muted">{label}</span>
    </div>
  );
}

function Macro({ label, grams, emoji }: { label: string; grams: number | null; emoji: string }) {
  return (
    <div className="rounded-card bg-sunken/70 px-2 py-3">
      <span aria-hidden className="text-lg">{emoji}</span>
      <p className="font-display font-bold tabular">{grams ?? "—"}g</p>
      <p className="text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}
