import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_MODEL, ai } from "./client";
import { RawRecipe, sanitizeRecipe, type ExtractedRecipe } from "./recipe-schema";

export type { ExtractedRecipe };

const SYSTEM = `Eres el asistente de Recetra, una app colombiana de planeación de comidas. Conviertes el texto de un video de cocina (título, descripción o caption, y a veces la transcripción del audio) en una receta estructurada.

Reglas:
- Escribe todo en español de Colombia.
- No inventes ingredientes ni pasos. Usa tanto el texto escrito como la transcripción del audio: lo que el creador dice en voz alta cuenta igual que lo escrito. Si no puedes identificar los ingredientes en ninguno de los dos, marca has_ingredient_list=false y devuelve solo lo que sí está.
- Si las cantidades se dicen de forma aproximada ("un chorrito", "media cebolla"), conviértelas a una cantidad razonable; eso no baja la confianza.
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
    output_config: { format: zodOutputFormat(RawRecipe), effort: "medium" },
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
  return sanitizeRecipe(response.parsed_output);
}
