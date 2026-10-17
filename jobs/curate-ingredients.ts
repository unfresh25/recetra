/**
 * Clears the pending ingredient queue: duplicates are merged into the catalog, the rest become active.
 * Run with: bun --conditions=react-server jobs/curate-ingredients.ts [--dry-run]
 */
import { curateIngredients } from "../lib/ai/store-matching";
import { createAdminClient } from "../lib/supabase/admin";

const db = createAdminClient();
const dryRun = process.argv.includes("--dry-run");
const { data: pending, error } = await db.from("ingredients").select("id, slug, name").eq("status", "pending_review").order("created_at");
if (error) throw error;
const { data: active } = await db.from("ingredients").select("id, slug, name").eq("status", "active");
const catalog = new Map((active ?? []).map((a) => [a.slug, a]));
console.log(`${pending.length} pending, ${catalog.size} in catalog${dryRun ? " (dry run)" : ""}`);

const tally = { merged: 0, approved: 0 };
for (let i = 0; i < pending.length; i += 30) {
  const batch = pending.slice(i, i + 30);
  const bySlug = new Map(batch.map((b) => [b.slug, b]));
  for (const decision of await curateIngredients(batch, [...catalog.values()])) {
    const ingredient = bySlug.get(decision.slug);
    if (!ingredient) continue;
    bySlug.delete(decision.slug);
    if (decision.mergeInto) {
      console.log(`merge ${ingredient.slug} -> ${decision.mergeInto}`);
      if (!dryRun) {
        const { error } = await db.rpc("merge_ingredient", { p_from: ingredient.id, p_into: catalog.get(decision.mergeInto)!.id });
        if (error) throw error;
      }
      tally.merged++;
    } else {
      if (!dryRun) await db.from("ingredients").update({ status: "active" }).eq("id", ingredient.id);
      catalog.set(ingredient.slug, ingredient);
      tally.approved++;
    }
  }
  if (bySlug.size) console.log(`no decision for: ${[...bySlug.keys()].join(", ")}`);
}
console.log("summary", tally);
