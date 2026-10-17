import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

const E = Constants.public.Enums;

// Enum fields are requested as plain strings listing the allowed values, then sanitized below:
// one stray value (e.g. "merienda") must not throw away an otherwise good recipe.
const oneOf = (values: readonly string[], description: string) =>
  z.string().describe(`${description}. One of: ${values.join(", ")}`);
const manyOf = (values: readonly string[], description: string) =>
  z.array(z.string()).describe(`${description}. Each one of: ${values.join(", ")}`);

const RawIngredient = z.object({
  name_as_written: z.string().describe("Ingredient as the creator wrote or said it, in Spanish"),
  catalog_slug: z
    .string()
    .nullable()
    .describe("Slug from the catalog list that is the same ingredient, or null if none fits"),
  new_ingredient: z
    .object({
      name: z.string().describe("Generic Spanish name, singular, no brand (e.g. 'Queso costeño')"),
      category: oneOf(E.ingredient_category, "Ingredient category"),
      base_unit: oneOf(E.base_unit, "Unit used to buy and sum it"),
      allergens: manyOf(E.allergen, "Allergens it contains"),
    })
    .nullable()
    .describe("Only when catalog_slug is null"),
  quantity: z.number().nullable().describe("Amount for the recipe's servings, null if unspecified"),
  unit: z.string().nullable().describe("g, kg, ml, l, unit, taza, cucharada, cucharadita, diente, pizca, al gusto..."),
  role: oneOf(
    E.ingredient_role,
    "core = the dish depends on it; accessory = garnish, topping or easily omitted/swapped seasoning",
  ),
  note: z.string().nullable().describe("Prep detail such as 'picado fino' or 'del día anterior'"),
});

export const RawRecipe = z.object({
  is_recipe: z.boolean().describe("False if the video is not a cooking recipe"),
  has_ingredient_list: z
    .boolean()
    .describe(
      "True if the ingredients can be identified from the caption or from the audio transcript (spoken counts; approximate quantities are fine). False only if you would have to guess them",
    ),
  title: z.string().describe("Clean Spanish dish name, no hashtags or emojis, max 80 chars"),
  meal_types: manyOf(E.meal_type, "When people in Colombia would normally eat this dish"),
  servings: z.number().describe("Number of servings the quantities make"),
  total_minutes: z.number().nullable(),
  styles: manyOf(E.recipe_style, "Styles that fit the recipe"),
  equipment: manyOf(E.kitchen_equipment, "Equipment the recipe needs"),
  ingredients: z.array(RawIngredient),
  steps: z.array(
    z.object({
      text: z.string().describe("One clear instruction in Spanish, imperative mood"),
      video_start_seconds: z.number().nullable().describe("Second in the video where this step starts, if known"),
    }),
  ),
  nutrition_per_serving: z.object({
    kcal: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
  }),
  confidence: z
    .number()
    .describe(
      "0 to 1: how faithful this structured recipe is to the source. 0.8+ when ingredients and steps come from the caption or transcript, even with approximate quantities; below 0.6 only if you had to invent parts",
    ),
});

export type RawRecipe = z.infer<typeof RawRecipe>;
type Enum<K extends keyof typeof E> = (typeof E)[K][number];

const MEAL_SYNONYMS: Record<string, Enum<"meal_type">> = {
  desayuno: "breakfast",
  onces: "breakfast",
  almuerzo: "lunch",
  comida: "lunch",
  cena: "dinner",
  merienda: "dinner",
  snack: "dinner",
};

function pick<K extends keyof typeof E>(kind: K, value: string | null | undefined): Enum<K> | null {
  const v = (value ?? "").trim().toLowerCase();
  return (E[kind] as readonly string[]).includes(v) ? (v as Enum<K>) : null;
}

function pickAll<K extends keyof typeof E>(kind: K, values: string[]): Enum<K>[] {
  return [...new Set(values.flatMap((v) => pick(kind, v) ?? []))];
}

/** Drops unknown enum values instead of failing, so one odd value doesn't sink the recipe. */
export function sanitizeRecipe(raw: RawRecipe) {
  const meals = [
    ...new Set(
      raw.meal_types.flatMap((m) => pick("meal_type", m) ?? MEAL_SYNONYMS[m.trim().toLowerCase()] ?? []),
    ),
  ];
  return {
    ...raw,
    meal_types: meals.length ? meals : (["lunch"] as Enum<"meal_type">[]),
    styles: pickAll("recipe_style", raw.styles),
    equipment: pickAll("kitchen_equipment", raw.equipment),
    ingredients: raw.ingredients.map((i) => ({
      ...i,
      role: pick("ingredient_role", i.role) ?? "core",
      new_ingredient: i.new_ingredient
        ? {
            name: i.new_ingredient.name,
            category: pick("ingredient_category", i.new_ingredient.category) ?? "other",
            base_unit: pick("base_unit", i.new_ingredient.base_unit) ?? "g",
            allergens: pickAll("allergen", i.new_ingredient.allergens),
          }
        : null,
    })),
  };
}

export type ExtractedRecipe = ReturnType<typeof sanitizeRecipe>;
