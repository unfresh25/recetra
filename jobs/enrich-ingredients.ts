/**
 * Fills how each catalog ingredient is bought (unit, piece weight, density, search terms).
 * Run with: bun --conditions=react-server jobs/enrich-ingredients.ts [--all]
 */
import { enrichIngredients } from "../lib/ai/store-matching";
import { createAdminClient } from "../lib/supabase/admin";

// Haiku over-marks staples ("tomate en lata"): only seasonings can be assumed at home.
const STAPLE_CATEGORIES = new Set(["spices", "oils", "sweeteners", "condiments"]);
const NOT_STAPLE = /lata|sobre|instant|sopa|guiso|gelatina|cacao|hielo|esencia|colorante/i;
// Dried herbs and leaveners live in other categories but are staples too.
const ALSO_STAPLE = /orégano|tomillo|laurel|finas hierbas|polvo de hornear|bicarbonato/i;

const db = createAdminClient();
let query = db.from("ingredients").select("id, slug, name, category, base_unit").eq("status", "active");
if (!process.argv.includes("--all")) query = query.is("purchase_unit", null);
const { data: ingredients, error } = await query.order("slug");
if (error) throw error;
console.log(`${ingredients.length} ingredients to enrich`);

let updated = 0;
for (let i = 0; i < ingredients.length; i += 40) {
  const batch = ingredients.slice(i, i + 40);
  const bySlug = new Map(batch.map((b) => [b.slug, b]));
  for (const e of await enrichIngredients(batch)) {
    const ingredient = bySlug.get(e.slug);
    if (!ingredient) continue;
    const { error } = await db
      .from("ingredients")
      .update({
        purchase_unit: e.purchase_unit,
        unit_weight_g: e.unit_weight_g && e.unit_weight_g > 0 ? e.unit_weight_g : null,
        density_g_ml: e.density_g_ml && e.density_g_ml > 0 && e.density_g_ml < 10 ? e.density_g_ml : null,
        pantry_staple: e.pantry_staple && (ALSO_STAPLE.test(ingredient.name) || (STAPLE_CATEGORIES.has(ingredient.category) && !NOT_STAPLE.test(ingredient.name))),
        search_terms: e.search_terms.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 3),
      })
      .eq("id", ingredient.id);
    if (error) throw error;
    updated++;
  }
  console.log(`${Math.min(i + 40, ingredients.length)}/${ingredients.length}`);
}
console.log(`enriched ${updated}`);
