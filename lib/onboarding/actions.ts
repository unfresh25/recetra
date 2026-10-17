"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DATA_TAG } from "@/lib/cache";
import { z } from "zod";
import { requireMembership } from "@/lib/auth";
import { Constants, type TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { BUDGET, MAX_STYLES } from "./options";

export type ActionResult = { error?: string };

const enums = Constants.public.Enums;
const uuidList = z.array(z.uuid()).max(500);

async function updateHousehold(values: TablesUpdate<"households">): Promise<ActionResult> {
  const { household } = await requireMembership();
  const supabase = await createClient();
  const { error } = await supabase.from("households").update(values).eq("id", household.id);
  updateTag(DATA_TAG);
  return error ? { error: "No pudimos guardar. Intenta de nuevo." } : {};
}

export async function saveStores(storeIds: string[]): Promise<ActionResult> {
  const parsed = uuidList.min(1, "Elige al menos una tienda.").safeParse(storeIds);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await requireMembership();
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_household_stores", { p_store_ids: parsed.data });
  updateTag(DATA_TAG);
  return error ? { error: "No pudimos guardar tus tiendas." } : {};
}

export async function savePeople(adults: number, kids: number): Promise<ActionResult> {
  const parsed = z
    .object({ adults: z.int().min(1).max(12), kids: z.int().min(0).max(12) })
    .safeParse({ adults, kids });
  if (!parsed.success) return { error: "Revisa la cantidad de personas." };
  return updateHousehold({ servings_adults: parsed.data.adults, servings_kids: parsed.data.kids });
}

export async function saveBudget(weeklyCop: number): Promise<ActionResult> {
  const parsed = z.int().min(BUDGET.min).max(BUDGET.max).safeParse(weeklyCop);
  if (!parsed.success) return { error: "Elige un presupuesto válido." };
  return updateHousehold({ weekly_budget_cop: parsed.data });
}

export async function saveStyles(styles: string[]): Promise<ActionResult> {
  const parsed = z
    .array(z.enum(enums.recipe_style))
    .min(1, "Elige al menos un estilo.")
    .max(MAX_STYLES, `Máximo ${MAX_STYLES} estilos.`)
    .safeParse(styles);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return updateHousehold({ styles: parsed.data });
}

export async function saveKitchen(equipment: string[]): Promise<ActionResult> {
  const parsed = z
    .array(z.enum(enums.kitchen_equipment))
    .min(1, "Elige al menos un equipo.")
    .safeParse(equipment);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return updateHousehold({ equipment: parsed.data });
}

async function replaceRestrictions(args: {
  p_kind: "allergy" | "dislike" | "diet";
  p_allergens?: (typeof enums.allergen)[number][];
  p_ingredient_ids?: string[];
  p_categories?: (typeof enums.ingredient_category)[number][];
  p_diets?: (typeof enums.diet)[number][];
}): Promise<ActionResult> {
  await requireMembership();
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_my_restrictions", args);
  updateTag(DATA_TAG);
  return error ? { error: "No pudimos guardar. Intenta de nuevo." } : {};
}

export async function saveAllergies(allergens: string[]): Promise<ActionResult> {
  const parsed = z.array(z.enum(enums.allergen)).safeParse(allergens);
  if (!parsed.success) return { error: "Revisa las alergias elegidas." };
  return replaceRestrictions({ p_kind: "allergy", p_allergens: parsed.data });
}

export async function saveDislikes(ingredientIds: string[], categories: string[]): Promise<ActionResult> {
  const parsed = z
    .object({ ingredientIds: uuidList, categories: z.array(z.enum(enums.ingredient_category)) })
    .safeParse({ ingredientIds, categories });
  if (!parsed.success) return { error: "Revisa lo que elegiste." };
  return replaceRestrictions({
    p_kind: "dislike",
    p_ingredient_ids: parsed.data.ingredientIds,
    p_categories: parsed.data.categories,
  });
}

export async function saveDiets(diets: string[]): Promise<ActionResult> {
  const parsed = z.array(z.enum(enums.diet)).safeParse(diets);
  if (!parsed.success) return { error: "Revisa las dietas elegidas." };
  return replaceRestrictions({ p_kind: "diet", p_diets: parsed.data });
}

/** Marks setup as finished for this member (and the household, if this was the first pass). */
export async function finishSetup() {
  const { member, household } = await requireMembership();
  const supabase = await createClient();
  const now = new Date().toISOString();
  if (!household.onboarded_at) {
    await supabase.from("households").update({ onboarded_at: now }).eq("id", household.id);
  }
  if (!member.onboarded_at) {
    await supabase.from("members").update({ onboarded_at: now }).eq("id", member.id);
  }
  updateTag(DATA_TAG);
  redirect("/plan");
}
