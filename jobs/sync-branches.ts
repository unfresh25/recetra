/**
 * Weekly: refreshes supermarket branches from OpenStreetMap. No AI.
 * Run with: bun --conditions=react-server jobs/sync-branches.ts [--file overpass.json]
 *   --file  load a saved Overpass response instead of querying (Overpass is often busy)
 */
import { readFile } from "node:fs/promises";
import { fetchBranches, parseBranches, type Element } from "../lib/stores/osm";
import { createAdminClient } from "../lib/supabase/admin";

const db = createAdminClient();
const { data: stores, error } = await db.from("stores").select("id, slug");
if (error) throw error;
const storeId = new Map(stores.map((s) => [s.slug, s.id]));

const fileIndex = process.argv.indexOf("--file");
const branches =
  fileIndex >= 0
    ? parseBranches((JSON.parse(await readFile(process.argv[fileIndex + 1]!, "utf8")) as { elements: Element[] }).elements)
    : await fetchBranches();
const now = new Date().toISOString();
const rows = branches.flatMap((b) =>
  storeId.has(b.storeSlug)
    ? [{ store_id: storeId.get(b.storeSlug)!, name: b.name, address: b.address, lat: b.lat, lng: b.lng, source: "osm" as const, osm_id: b.osmId, last_seen_at: now }]
    : [],
);
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await db.from("branches").upsert(rows.slice(i, i + 200), { onConflict: "osm_id" });
  if (error) throw error;
}
// Branches that left OSM (closed or retagged) disappear; never touch manual ones.
const { count } = await db.from("branches").delete({ count: "exact" }).eq("source", "osm").lt("last_seen_at", now);
const perStore = Object.fromEntries([...storeId.keys()].map((slug) => [slug, branches.filter((b) => b.storeSlug === slug).length]));
console.log(`synced ${rows.length} branches, removed ${count ?? 0}`, perStore);
