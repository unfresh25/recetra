import "server-only";
import { privateData } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

export type NearbyStore = { id: string; slug: string; name: string; logo_url: string | null; brand_color: string };
export type Branch = { id: string; storeId: string; name: string; address: string | null; lat: number; lng: number; manual: boolean };

/** The household's stores and every known branch of them (OSM plus the ones they added). */
export async function getNearbyStores(householdId: string) {
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
  const { data: rows } = await supabase
    .from("household_stores")
    .select("stores (id, slug, name, logo_url, brand_color, sort_order)")
    .eq("household_id", householdId);
  const stores: NearbyStore[] = (rows ?? [])
    .flatMap((r) => (r.stores ? [r.stores] : []))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ sort_order, ...s }) => (void sort_order, s));
  if (!stores.length) return { stores, branches: [] as Branch[] };
  const { data: branches } = await supabase
    .from("branches")
    .select("id, store_id, name, address, lat, lng, source")
    .in("store_id", stores.map((s) => s.id));
  return {
    stores,
    branches: (branches ?? []).map((b) => ({ id: b.id, storeId: b.store_id, name: b.name, address: b.address, lat: b.lat, lng: b.lng, manual: b.source === "manual" })),
  };
}
