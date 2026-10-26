import "server-only";
import { cacheLife } from "next/cache";
import type { Membership } from "@/lib/auth";
import { privateData } from "@/lib/cache";
import { loadPlanInputs } from "@/lib/plan/data";
import { checkEligibility, MEAL_ORDER } from "@/lib/plan/engine";
import { getWeekPlan } from "@/lib/plan/queries";
import { mondayOf, todayInBogota } from "@/lib/plan/week";
import { listFavorites } from "@/lib/recipes/queries";
import { createClient } from "@/lib/supabase/server";
import { recipeOfTheDay } from "./selection";

export async function getDiscover(membership: Membership) {
  "use cache: private";
  privateData();
  const now = new Date();
  const today = todayInBogota(now);
  // A cached feed must not carry yesterday's selection past the local midnight.
  const untilMidnight = Math.max(1, Math.ceil((Date.parse(`${today}T00:00:00-05:00`) + 86400000 - now.getTime()) / 1000));
  cacheLife({ stale: Math.min(300, untilMidnight), revalidate: Math.min(300, untilMidnight), expire: untilMidnight + 1 });
  const supabase = await createClient({ privateCache: true });
  const [inputs, week, favorites, overrides] = await Promise.all([
    loadPlanInputs(membership, mondayOf(today), 0, { privateCache: true }),
    getWeekPlan(membership.household.id, mondayOf(today)),
    listFavorites(),
    supabase.from("household_recipe_overrides").select("recipe_id, cover_image_path"),
  ]);
  if (overrides.error) throw overrides.error;
  const eligibleIds = new Set(inputs.candidates.filter((recipe) => checkEligibility(recipe, inputs.ctx).ok).map((recipe) => recipe.id));
  const covers = new Map(overrides.data.map((override) => [override.recipe_id, override.cover_image_path]));
  const eligible = inputs.recipes
    .filter((recipe) => recipe.visibility === "public" && eligibleIds.has(recipe.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      author_name: recipe.author_name,
      total_minutes: recipe.total_minutes,
      meal_types: recipe.meal_types,
      kcal_per_serving: recipe.kcal_per_serving,
      source_platform: recipe.source_platform,
      source_video_id: recipe.source_video_id,
      styles: recipe.styles,
      coverPath: covers.get(recipe.id) ?? recipe.source_image_path,
      likedByMe: inputs.ctx.reactions[recipe.id]?.[membership.member.id]?.favorite ?? false,
    }));
  const todayPlan = week ? MEAL_ORDER.map((meal) => ({
    mealType: meal,
    recipe: week.meals.find((entry) => entry.day === today && entry.mealType === meal)?.recipe ?? null,
  })) : null;
  const daily = recipeOfTheDay(eligible, now);
  const styles = membership.household.styles;
  const forYourStyle = eligible.filter((recipe) => recipe.id !== daily?.id && (!styles.length || recipe.styles.some((style) => styles.includes(style)))).slice(0, 10);
  const quick = eligible.filter((recipe) => recipe.total_minutes !== null && recipe.total_minutes <= 20).slice(0, 10);
  const videos = eligible.filter((recipe) => recipe.source_video_id !== null).slice(0, 4);
  const favoriteIds = new Set(favorites.map((recipe) => recipe.id));
  const houseFavorites = eligible.filter((recipe) => favoriteIds.has(recipe.id));
  const shown = new Set([...(daily ? [daily] : []), ...forYourStyle, ...quick, ...videos, ...houseFavorites].map((recipe) => recipe.id));
  for (const meal of todayPlan ?? []) if (meal.recipe) shown.add(meal.recipe.id);
  const newest = eligible.filter((recipe) => !shown.has(recipe.id)).slice(0, 10);
  const displayed = [...(daily ? [daily] : []), ...forYourStyle, ...quick, ...videos, ...houseFavorites, ...newest];
  const ids = [...new Set(displayed.map((recipe) => recipe.id))];
  const { data: counts, error } = await supabase.rpc("recipe_like_counts", { p_recipe_ids: ids });
  if (error) throw error;
  const likes = new Map(counts.map((row) => [row.recipe_id, row.likes]));
  const withLikes = (recipe: typeof eligible[number]) => ({ ...recipe, likes: likes.get(recipe.id) ?? 0 });
  return {
    recipeOfTheDay: daily ? withLikes(daily) : null,
    todayPlan,
    forYourStyle: forYourStyle.map(withLikes),
    quick: quick.map(withLikes),
    videos: videos.map(withLikes),
    houseFavorites: houseFavorites.map(withLikes),
    newest: newest.map(withLikes),
  };
}

export type DiscoverRecipe = NonNullable<Awaited<ReturnType<typeof getDiscover>>["recipeOfTheDay"]>;
