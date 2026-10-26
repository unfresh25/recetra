"use server";

import { updateTag } from "next/cache";
import { DATA_TAG } from "@/lib/cache";
import { z } from "zod";
import { requireReadyMembership } from "@/lib/auth";
import { Constants, type Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { loadPlanInputs } from "./data";
import { alternativesFor, generatePlan } from "./engine";
import type { Adjustment, MealType, PlannedMeal } from "./types";
import { addDays, mondayOf, todayInBogota } from "./week";

const toJson = (adjustments: Adjustment[]) => ({ removed: adjustments }) as unknown as Json;

/** Saves the week without invalidating the route, so callers control when to reveal it. */
export async function generateWeek(day?: string): Promise<{ error?: string }> {
  const membership = await requireReadyMembership();
  const weekStart = mondayOf(day ?? todayInBogota());
  const { candidates, ctx, servings } = await loadPlanInputs(membership, weekStart, Date.now() % 2_147_483_647);
  const plan = generatePlan(candidates, ctx);

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_week_plan", {
    p_week_start: weekStart,
    p_meals: plan.map((meal) => ({
      day: meal.day,
      meal_type: meal.mealType,
      recipe_id: meal.recipeId ?? "",
      servings,
      adjustments: meal.recipeId ? toJson(meal.adjustments) : ({ empty_reason: meal.emptyReason } as Json),
    })) as unknown as Json,
  });
  if (error) return { error: "No pudimos armar el plan. Intenta de nuevo." };
  return {};
}

/** Reveal a saved week only after the caller's progress UI has finished. */
export async function refreshGeneratedWeek(): Promise<void> {
  await requireReadyMembership();
  // updateTag expires the data and includes the refreshed route in this action's response.
  updateTag(DATA_TAG);
}

async function loadSlot(planMealId: string) {
  const membership = await requireReadyMembership();
  const supabase = await createClient();
  const { data: meal } = await supabase
    .from("plan_meals")
    .select("id, day, meal_type, recipe_id, meal_plan_id, meal_plans (week_start)")
    .eq("id", planMealId)
    .maybeSingle();
  if (!meal?.meal_plans) return null;
  const { data: week } = await supabase
    .from("plan_meals")
    .select("day, meal_type, recipe_id")
    .eq("meal_plan_id", meal.meal_plan_id);
  const inputs = await loadPlanInputs(membership, meal.meal_plans.week_start, 7);
  const plan: PlannedMeal[] = (week ?? []).map((w) => ({
    day: w.day,
    mealType: w.meal_type,
    recipeId: w.recipe_id,
    adjustments: [],
    emptyReason: null,
  }));
  return { meal, plan, ...inputs };
}

const reasonSchema = z.enum(Constants.public.Enums.replace_reason).nullable();

export type Alternative = {
  recipeId: string;
  title: string;
  minutes: number | null;
  adjustments: Adjustment[];
};

export async function getAlternatives(planMealId: string, reason: string | null): Promise<Alternative[]> {
  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) return [];
  const slot = await loadSlot(planMealId);
  if (!slot) return [];
  return alternativesFor(
    slot.candidates,
    slot.ctx,
    slot.plan,
    { day: slot.meal.day, mealType: slot.meal.meal_type as MealType, recipeId: slot.meal.recipe_id },
    parsed.data,
  ).map((a) => ({ recipeId: a.recipe.id, title: a.recipe.title, minutes: a.recipe.minutes, adjustments: a.adjustments }));
}

export async function replaceMeal(planMealId: string, recipeId: string, reason: string | null): Promise<{ error?: string }> {
  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) return { error: "Motivo inválido." };
  const slot = await loadSlot(planMealId);
  if (!slot) return { error: "No encontramos esa comida." };
  const choice = alternativesFor(
    slot.candidates,
    slot.ctx,
    slot.plan,
    { day: slot.meal.day, mealType: slot.meal.meal_type as MealType, recipeId: slot.meal.recipe_id },
    null,
    1000,
  ).find((a) => a.recipe.id === recipeId);
  if (!choice) return { error: "Esa receta no es apta para su hogar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_plan_meal", {
    p_plan_meal_id: planMealId,
    p_recipe_id: recipeId,
    // No reason given counts as "solo hoy no": recorded, but nothing is learned from it.
    p_reason: parsed.data ?? "not_today",
    p_adjustments: toJson(choice.adjustments),
  });
  if (error) return { error: "No pudimos reemplazarla." };
  updateTag(DATA_TAG);
  return {};
}

type ToggleKind = "favorite" | "veto" | "dislike";

/** Resolve the household's slot, then reuse replacement eligibility, adjustments and RPC. */
export async function placeRecipeInPlan(recipeId: string, day: string, mealType: string): Promise<{ error?: string }> {
  const { household } = await requireReadyMembership();
  const parsed = z.object({ recipeId: z.uuid(), day: z.iso.date(), mealType: z.enum(Constants.public.Enums.meal_type) }).safeParse({ recipeId, day, mealType });
  if (!parsed.success) return { error: "Selecciona un día y una comida válidos." };
  const today = todayInBogota();
  const monday = mondayOf(today);
  if (day < today || day > addDays(monday, 13)) return { error: "Elige un día disponible de esta semana o la próxima." };
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase.from("meal_plans").select("id")
    .eq("household_id", household.id).eq("week_start", mondayOf(day)).maybeSingle();
  if (planError) return { error: "No pudimos consultar tu plan. Intenta de nuevo." };
  if (!plan) return { error: "Aún no tienes plan para esa semana." };
  const { data: meal, error: mealError } = await supabase.from("plan_meals").select("id, recipe_id")
    .eq("meal_plan_id", plan.id).eq("day", day).eq("meal_type", parsed.data.mealType).maybeSingle();
  if (mealError) return { error: "No pudimos consultar esa comida. Intenta de nuevo." };
  if (!meal) return { error: "No encontramos esa comida en tu plan." };
  if (meal.recipe_id === recipeId) return { error: "Esta receta ya está en esa comida del plan." };
  const result = await replaceMeal(meal.id, recipeId, null);
  if (result.error === "Esa receta no es apta para su hogar.") return { error: "Esta receta no es apta para su hogar." };
  if (result.error === "No pudimos reemplazarla.") return { error: "No pudimos agregar la receta al plan. Intenta de nuevo." };
  return result;
}

/** Favorite and veto are toggles; "no me gusta" is recorded once per recipe. */
export async function toggleReaction(recipeId: string, kind: ToggleKind): Promise<{ active: boolean }> {
  await requireReadyMembership();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_recipe_reaction", { p_recipe_id: recipeId, p_kind: kind });
  if (error) throw error;
  updateTag(DATA_TAG);
  return { active: data };
}

export async function markCooked(recipeId: string, planMealId?: string) {
  const { member } = await requireReadyMembership();
  const supabase = await createClient();
  await supabase.from("reactions").insert({ member_id: member.id, recipe_id: recipeId, kind: "cooked", plan_meal_id: planMealId ?? null });
  if (planMealId) await supabase.from("plan_meals").update({ status: "cooked" }).eq("id", planMealId);
  updateTag(DATA_TAG);
}

/** Logs a planned meal as eaten (or undoes it) without going through cook mode. */
export async function setEaten(planMealId: string, eaten: boolean) {
  const { member } = await requireReadyMembership();
  const supabase = await createClient();
  const { data: meal } = await supabase.from("plan_meals").select("id, recipe_id").eq("id", planMealId).maybeSingle();
  if (!meal?.recipe_id) return { error: "No encontramos esa comida." };
  if (eaten) {
    await supabase.from("reactions").insert({ member_id: member.id, recipe_id: meal.recipe_id, kind: "cooked", plan_meal_id: planMealId });
    await supabase.from("plan_meals").update({ status: "cooked" }).eq("id", planMealId);
  } else {
    await supabase.from("reactions").delete().eq("plan_meal_id", planMealId).eq("kind", "cooked").eq("member_id", member.id);
    await supabase.from("plan_meals").update({ status: "planned" }).eq("id", planMealId);
  }
  updateTag(DATA_TAG);
  return {};
}
