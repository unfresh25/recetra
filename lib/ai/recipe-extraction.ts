import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { AI_MODEL, ai } from "./client";

const E = Constants.public.Enums;

const ExtractedIngredient = z.object({
  name_as_written: z.string().describe("Ingredient as the creator wrote or said it, in Spanish"),
  catalog_slug: z
    .string()
    .nullable()
    .describe("Slug from the catalog list that is the same ingredient, or null if none fits"),
  new_ingredient: z
    .object({
      name: z.string().describe("Generic Spanish name, singular, no brand (e.g. 'Queso costeño')"),
      category: z.enum(E.ingredient_category),
      base_unit: z.enum(E.base_unit),
      allergens: z.array(z.enum(E.allergen)),
    })
    .nullable()
    .describe("Only when catalog_slug is null"),
  quantity: z.number().nullable().describe("Amount for the recipe's servings, null if unspecified"),
  unit: z.string().nullable().describe("g, kg, ml, l, unit, taza, cucharada, cucharadita, diente, pizca, al gusto..."),
  role: z
    .enum(E.ingredient_role)
    .describe("core = the dish depends on it; accessory = garnish, topping or easily omitted/swapped seasoning"),
  note: z.string().nullable().describe("Prep detail such as 'picado fino' or 'del día anterior'"),
});

export const ExtractedRecipe = z.object({
  is_recipe: z.boolean().describe("False if the video is not a cooking recipe"),
  has_ingredient_list: z
    .boolean()
    .describe("True only if the text actually lists the ingredients; false if you would have to guess"),
  title: z.string().describe("Clean Spanish dish name, no hashtags or emojis, max 80 chars"),
  meal_types: z.array(z.enum(E.meal_type)).describe("When people in Colombia would normally eat this dish"),
  servings: z.number().describe("Number of servings the quantities make"),
  total_minutes: z.number().nullable(),
  styles: z.array(z.enum(E.recipe_style)),
  equipment: z.array(z.enum(E.kitchen_equipment)).describe("Equipment the recipe needs"),
  ingredients: z.array(ExtractedIngredient),
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
  confidence: z.number().describe("0 to 1: how sure you are that this structured recipe is faithful to the source"),
});

export type ExtractedRecipe = z.infer<typeof ExtractedRecipe>;

const SYSTEM = `Eres el asistente de Recetra, una app colombiana de planeación de comidas. Conviertes el texto de un video de cocina (título, descripción o caption, y a veces la transcripción del audio) en una receta estructurada.

Reglas:
- Escribe todo en español de Colombia.
- No inventes ingredientes ni pasos. Si el texto no trae la lista de ingredientes, marca has_ingredient_list=false y devuelve solo lo que sí está.
- meal_types: piensa en cuándo se come el plato en Colombia, no solo en sus ingredientes.
  - Desayuno: calentado, huevos pericos, arepa con huevo, changua, caldo de costilla, tamal, avena, pandebono, chocolate con queso, frutas, yogur con granola.
  - Almuerzo: bandeja paisa, sancocho, ajiaco, arroz con pollo, arroz con todo, sudado de pollo, mondongo, frijoles con garra, pescado frito con patacón.
  - Cena: platos más ligeros o rápidos (sándwiches, wraps, cremas, ensaladas completas, pastas sencillas); también pueden servir platos de almuerzo ligeros.
  - Un plato puede servir para más de un momento solo si es realmente común así.
- role:
  - core: el plato depende del ingrediente (la proteína principal, el arroz del arroz con pollo, los camarones del arroz con camarones).
  - accessory: se puede quitar o cambiar sin arruinar el plato (cilantro o perejil picado encima, cebollín de decoración, salsas al lado, ají).
- catalog_slug: usa solo slugs de la lista de catálogo. Si no hay uno equivalente, deja null y llena new_ingredient con un nombre genérico, sin marca.
- Cantidades para las porciones que hace la receta. Convierte fracciones a decimales.
- Nutrición: estimación razonable por porción a partir de los ingredientes.
- confidence < 0.6 si tuviste que adivinar mucho.`;

export type CatalogEntry = { slug: string; name: string };

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "truncated" | "invalid",
  ) {
    super(message);
  }
}

export async function extractRecipe(input: {
  title: string;
  text: string;
  transcript?: string | null;
  authorName?: string | null;
  durationSeconds?: number | null;
  catalog: CatalogEntry[];
}): Promise<ExtractedRecipe> {
  const catalog = input.catalog.map((c) => `${c.slug}: ${c.name}`).join("\n");
  const source = [
    `Título: ${input.title}`,
    input.authorName ? `Autor: ${input.authorName}` : null,
    input.durationSeconds ? `Duración: ${input.durationSeconds} s` : null,
    `Descripción o caption:\n${input.text || "(vacío)"}`,
    input.transcript ? `Transcripción del audio:\n${input.transcript}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await ai().messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    output_config: { format: zodOutputFormat(ExtractedRecipe), effort: "medium" },
    // Catalog first and stable so it caches across imports.
    system: [
      { type: "text", text: SYSTEM },
      { type: "text", text: `Catálogo de ingredientes (slug: nombre):\n${catalog}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: source }],
  });

  if (response.stop_reason === "refusal") throw new ExtractionError("Model refused", "refusal");
  if (response.stop_reason === "max_tokens") throw new ExtractionError("Output truncated", "truncated");
  if (!response.parsed_output) throw new ExtractionError("Unparseable output", "invalid");
  return response.parsed_output;
}
