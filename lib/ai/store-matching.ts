import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL, ai } from "./client";

const BUY_UNITS = ["g", "ml", "unit"] as const;

// ---------------------------------------------------------------------------------------------
// Ingredient enrichment: how each catalog ingredient is bought in a Colombian supermarket.

const Enrichment = z.object({
  ingredients: z.array(
    z.object({
      slug: z.string(),
      purchase_unit: z.string().describe(`How stores sell it. One of: ${BUY_UNITS.join(", ")}`),
      unit_weight_g: z.number().nullable().describe("Grams of one typical piece for anything a recipe may count in pieces, even if stores sell it by weight (huevo 50, tomate 120, papa 150, zanahoria 80, cebolla cabezona 150, cabeza de ajo 40, limón 60, pechuga 300, tajada de queso 20). Null only for things never counted (arroz, sal, leche, harina)"),
      density_g_ml: z.number().nullable().describe("Grams per ml for cup/spoon conversions (arroz crudo 0.85, harina 0.55, azúcar 0.85, aceite 0.92, leche 1.03); null if irrelevant"),
      pantry_staple: z.boolean().describe("True only for seasonings almost every kitchen has and recipes use by the pinch or spoon: sal, pimienta, comino, color, orégano y otras especias o hierbas secas, aceite vegetal, vinagre, azúcar, polvo de hornear, bicarbonato. False for anything you buy for a specific dish: granos, legumbres (lenteja, fríjol), harinas, arroz, lácteos, salsas, caldos, aceite de oliva"),
      search_terms: z.array(z.string()).describe("1 to 3 short supermarket search queries, most specific first, in Colombian Spanish (e.g. 'cebolla cabezona', 'cebolla blanca')"),
    }),
  ),
});
export type IngredientEnrichment = z.infer<typeof Enrichment>["ingredients"][number] & { purchase_unit: (typeof BUY_UNITS)[number] };

export async function enrichIngredients(
  items: { slug: string; name: string; category: string; base_unit: string }[],
): Promise<IngredientEnrichment[]> {
  const response = await ai().messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    output_config: { format: zodOutputFormat(Enrichment), effort: "low" },
    system:
      "Eres el asistente de Recetra (Barranquilla, Colombia). Para cada ingrediente indica cómo se compra en supermercados colombianos (Éxito, Olímpica, D1) y los datos para convertir cantidades de recetas. Las frutas y verduras se venden por peso (g) salvo las que se venden por unidad (aguacate, limón a veces por malla: usa g si hay duda). Huevos por unidad. Líquidos en ml.",
    messages: [{ role: "user", content: items.map((i) => `${i.slug}: ${i.name} (${i.category}, base ${i.base_unit})`).join("\n") }],
  });
  const parsed = response.parsed_output?.ingredients ?? [];
  return parsed.flatMap((e) =>
    (BUY_UNITS as readonly string[]).includes(e.purchase_unit) ? [{ ...e, purchase_unit: e.purchase_unit as IngredientEnrichment["purchase_unit"] }] : [],
  );
}

// ---------------------------------------------------------------------------------------------
// Product matching: which search results are the ingredient itself, and their package size.

const Matches = z.object({
  matches: z.array(
    z.object({
      index: z.number().int().describe("Index of the candidate in the list"),
      confidence: z.number().describe("0 to 1: how sure you are this product is the ingredient as bought for cooking"),
      package_qty: z.number().describe("Package size in package_unit (a 1 lb pack is 500 g; 30 eggs is 30 unit; 6 x 200 ml is 1200 ml)"),
      package_unit: z.string().describe(`One of: ${BUY_UNITS.join(", ")}`),
    }),
  ),
});

export type ProductCandidate = { name: string; brand: string | null; category: string | null; priceCop: number; parsed: string | null };
export type ProductMatch = { index: number; confidence: number; package_qty: number; package_unit: (typeof BUY_UNITS)[number] };

const MATCH_SYSTEM = `Eres el asistente de compras de Recetra (Colombia). Te doy un ingrediente de receta y resultados de búsqueda de un supermercado. Devuelve SOLO los productos que son ese ingrediente tal como se compra para cocinar.

Reglas:
- Cualquier marca sirve. Presentaciones distintas del mismo producto sirven (500 g, 1 kg, 3 kg).
- No sirven: productos preparados o derivados (arroz con leche, papas fritas de paquete para "papa"), utensilios, combos, kits, mascotas, otro ingrediente parecido (cebolla roja para "cebolla cabezona blanca", pechuga para "muslo"), ni bultos institucionales de más de 12 kg.
- Para frutas, verduras y carnes a granel, "x 1000 g" o "kilo" suele ser el precio por kilo: package_qty 1000 g.
- package_qty en la unidad indicada; usa la pista de tamaño si está y es coherente.
- Si ninguno sirve, devuelve una lista vacía.`;

export async function matchProducts(
  ingredient: { name: string; category: string; purchase_unit: string },
  candidates: ProductCandidate[],
): Promise<ProductMatch[]> {
  if (!candidates.length) return [];
  const list = candidates
    .map((c, i) => `${i}. ${c.name}${c.brand ? ` | marca ${c.brand}` : ""}${c.category ? ` | ${c.category}` : ""} | $${c.priceCop}${c.parsed ? ` | tamaño: ${c.parsed}` : ""}`)
    .join("\n");
  const response = await ai().messages.parse({
    model: AI_MODEL,
    max_tokens: 4000,
    output_config: { format: zodOutputFormat(Matches), effort: "low" },
    system: [{ type: "text", text: MATCH_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Ingrediente: ${ingredient.name} (${ingredient.category}; se compra en ${ingredient.purchase_unit})\n\nResultados:\n${list}`,
      },
    ],
  });
  return (response.parsed_output?.matches ?? []).flatMap((m) =>
    m.index >= 0 && m.index < candidates.length && m.package_qty > 0 && (BUY_UNITS as readonly string[]).includes(m.package_unit)
      ? [{ ...m, confidence: Math.min(Math.max(m.confidence, 0), 1), package_unit: m.package_unit as ProductMatch["package_unit"] }]
      : [],
  );
}

// ---------------------------------------------------------------------------------------------
// Curation: ingredients created by imports are either duplicates of the catalog or new entries.

const Curation = z.object({
  decisions: z.array(
    z.object({
      slug: z.string().describe("Slug of the pending ingredient"),
      merge_into: z.string().nullable().describe("Catalog slug it is the same as, or null to keep it as a new ingredient"),
    }),
  ),
});

const CURATION_SYSTEM = `Eres el curador del catálogo de ingredientes de Recetra (Colombia). Para cada ingrediente pendiente decide si es el MISMO que uno del catálogo (merge_into = ese slug) o uno nuevo (null).

Es el mismo si en el supermercado comprarías el mismo producto y tiene los mismos alérgenos: plurales, sinónimos regionales ("cebollín" y "cebolla larga" no: son distintos; "ají dulce" y "ají topito" sí), o nombres con preparación ("tomate picado" = tomate).
NO es el mismo si cambia lo que compras: versiones light, molido frente a entero, ahumado, otra variedad, otra parte del animal.`;

export async function curateIngredients(pending: { slug: string; name: string }[], catalog: { slug: string; name: string }[]) {
  const response = await ai().messages.parse({
    model: AI_MODEL,
    max_tokens: 8000,
    output_config: { format: zodOutputFormat(Curation), effort: "low" },
    system: [
      { type: "text", text: CURATION_SYSTEM },
      { type: "text", text: `Catálogo (slug: nombre):\n${catalog.map((c) => `${c.slug}: ${c.name}`).join("\n")}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: `Pendientes:\n${pending.map((p) => `${p.slug}: ${p.name}`).join("\n")}` }],
  });
  const known = new Set(catalog.map((c) => c.slug));
  return (response.parsed_output?.decisions ?? []).map((d) => ({
    slug: d.slug,
    mergeInto: d.merge_into && known.has(d.merge_into) && d.merge_into !== d.slug ? d.merge_into : null,
  }));
}
