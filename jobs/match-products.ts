/**
 * Searches each VTEX store for every catalog ingredient and lets Haiku keep the products that are it.
 * Skips (ingredient, store) pairs searched in the last --stale-days (default 30).
 *
 * Run with: bun --conditions=react-server jobs/match-products.ts [--stores d1,olimpica] [--limit 50] [--stale-days 30]
 */
import { matchProducts } from "../lib/ai/store-matching";
import { parsePackage } from "../lib/stores/package";
import { searchProducts, type StoreProduct } from "../lib/stores/vtex";
import { createAdminClient } from "../lib/supabase/admin";

const AUTO_CONFIDENCE = 0.7;
const MIN_CONFIDENCE = 0.4;

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const db = createAdminClient();
const storeFilter = arg("stores")?.split(",");
const limit = Number(arg("limit") ?? Infinity);
const staleBefore = new Date(Date.now() - Number(arg("stale-days") ?? 30) * 86_400_000).toISOString();

let storesQuery = db.from("stores").select("id, slug, base_url, api_path_prefix").eq("source", "vtex").not("base_url", "is", null);
if (storeFilter) storesQuery = storesQuery.in("slug", storeFilter);
// Jumbo has not answered our requests so far; it stays out until it does.
const { data: stores, error: storesError } = await storesQuery.neq("slug", "jumbo");
if (storesError) throw storesError;

const { data: ingredients, error } = await db
  .from("ingredients")
  .select("id, slug, name, category, purchase_unit, base_unit, search_terms")
  .eq("status", "active")
  .not("purchase_unit", "is", null)
  .order("slug");
if (error) throw error;

const { data: runs } = await db.from("match_runs").select("ingredient_id, store_id, searched_at");
const fresh = new Set((runs ?? []).filter((r) => r.searched_at > staleBefore).map((r) => `${r.ingredient_id}:${r.store_id}`));

const tally = { searched: 0, products: 0, auto: 0, review: 0, empty: 0, errors: 0 };

async function matchStore(store: NonNullable<typeof stores>[number]) {
  const todo = ingredients!.filter((i) => !fresh.has(`${i.id}:${store.id}`)).slice(0, limit);
  console.log(`[${store.slug}] ${todo.length} ingredients to search`);
  for (const ingredient of todo) {
    try {
      const terms = ingredient.search_terms.length ? ingredient.search_terms.slice(0, 2) : [ingredient.name.toLowerCase()];
      const seen = new Map<string, StoreProduct>();
      for (const term of terms) for (const p of await searchProducts(store, term, 15)) if (!seen.has(p.sku)) seen.set(p.sku, p);
      const candidates = [...seen.values()].filter((p) => p.available).slice(0, 24);
      const picks = await matchProducts(
        { name: ingredient.name, category: ingredient.category, purchase_unit: ingredient.purchase_unit! },
        candidates.map((c) => {
          const parsed = parsePackage(c.name);
          return { name: c.name, brand: c.brand, category: c.category, priceCop: c.priceCop, parsed: parsed ? `${parsed.qty} ${parsed.unit}` : null };
        }),
      );
      const kept = picks.filter((m) => m.confidence >= MIN_CONFIDENCE);
      for (const pick of kept) {
        const p = candidates[pick.index]!;
        const { data: product, error } = await db
          .from("products")
          .upsert(
            {
              store_id: store.id, sku: p.sku, name: p.name, brand: p.brand, package_qty: pick.package_qty, package_unit: pick.package_unit,
              url: p.url, image_url: p.imageUrl, available: true, last_seen_at: new Date().toISOString(),
            },
            { onConflict: "store_id,sku" },
          )
          .select("id")
          .single();
        if (error) throw error;
        const status = pick.confidence >= AUTO_CONFIDENCE ? "auto" : "pending_review";
        // Confirmed or rejected matches are human decisions: never overwrite them.
        const { data: existing } = await db.from("product_matches").select("status").eq("ingredient_id", ingredient.id).eq("product_id", product.id).maybeSingle();
        if (!existing) await db.from("product_matches").insert({ ingredient_id: ingredient.id, product_id: product.id, confidence: pick.confidence, status });
        else if (existing.status === "auto" || existing.status === "pending_review")
          await db.from("product_matches").update({ confidence: pick.confidence, status }).eq("ingredient_id", ingredient.id).eq("product_id", product.id);
        await db.from("prices").insert({ product_id: product.id, price_cop: p.priceCop, list_price_cop: p.listPriceCop });
        tally.products++;
        tally[status === "auto" ? "auto" : "review"]++;
      }
      if (!kept.length) tally.empty++;
      tally.searched++;
      await db.from("match_runs").upsert({ ingredient_id: ingredient.id, store_id: store.id, searched_at: new Date().toISOString(), found: kept.length });
      console.log(`[${store.slug}] ${ingredient.slug} -> ${kept.length} of ${candidates.length}`);
    } catch (error) {
      tally.errors++;
      console.error(`[${store.slug}] ${ingredient.slug} failed:`, error instanceof Error ? error.message : error);
    }
  }
}

// Stores run in parallel; each one is throttled to 1 req/s on its own.
await Promise.all((stores ?? []).map(matchStore));
console.log("summary", tally);
