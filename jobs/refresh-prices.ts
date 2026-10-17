/**
 * Nightly: re-reads every matched product and stores a new price only when it changed.
 * Products that vanish are marked unavailable and their ingredient is searched again next run.
 *
 * Run with: bun --conditions=react-server jobs/refresh-prices.ts
 */
import { productsBySku } from "../lib/stores/vtex";
import { createAdminClient } from "../lib/supabase/admin";

const db = createAdminClient();
const { data: stores, error } = await db.from("stores").select("id, slug, base_url, api_path_prefix").eq("source", "vtex").neq("slug", "jumbo");
if (error) throw error;

const tally = { checked: 0, changed: 0, gone: 0 };

async function pageAll<T>(fetchPage: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function refreshStore(store: NonNullable<typeof stores>[number]) {
  const products = await pageAll((from) =>
    db.from("products").select("id, sku, available, product_matches!inner(ingredient_id, status)").eq("store_id", store.id).in("product_matches.status", ["auto", "confirmed"]).range(from, from + 999),
  );
  if (!products.length) return;
  // Chunked: a long `in (...)` list overflows the request URL.
  const current = new Map<string, number | null>();
  for (let i = 0; i < products.length; i += 200) {
    const ids = products.slice(i, i + 200).map((p) => p.id);
    const { data, error } = await db.from("current_prices").select("product_id, price_cop").in("product_id", ids);
    if (error) throw error;
    for (const row of data ?? []) if (row.product_id) current.set(row.product_id, row.price_cop);
  }
  const offers = new Map((await productsBySku(store, products.map((p) => p.sku))).map((o) => [o.sku, o]));
  const now = new Date().toISOString();

  for (const product of products) {
    tally.checked++;
    const offer = offers.get(product.sku);
    if (!offer || !offer.available) {
      if (product.available) {
        tally.gone++;
        await db.from("products").update({ available: false }).eq("id", product.id);
        const ingredientIds = product.product_matches.map((m) => m.ingredient_id);
        await db.from("match_runs").delete().eq("store_id", store.id).in("ingredient_id", ingredientIds);
      }
      continue;
    }
    await db.from("products").update({ available: true, last_seen_at: now }).eq("id", product.id);
    if (current.get(product.id) !== offer.priceCop) {
      tally.changed++;
      await db.from("prices").insert({ product_id: product.id, price_cop: offer.priceCop, list_price_cop: offer.listPriceCop });
    }
  }
  console.log(`[${store.slug}] ${products.length} products checked`);
}

await Promise.all((stores ?? []).map(refreshStore));
console.log("summary", tally);
