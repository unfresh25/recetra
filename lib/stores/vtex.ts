/** Public VTEX catalog API (Éxito, Carulla, Olímpica, D1, MegaTiendas). No auth; be polite. */
export type VtexStore = { slug: string; base_url: string | null; api_path_prefix: string | null };

export type StoreProduct = {
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  priceCop: number;
  listPriceCop: number | null;
  available: boolean;
  url: string | null;
  imageUrl: string | null;
};

type RawProduct = {
  productName: string;
  brand?: string;
  link?: string;
  categories?: string[];
  items: {
    itemId: string;
    name?: string;
    images?: { imageUrl: string }[];
    sellers: { commertialOffer: { Price: number; ListPrice?: number; IsAvailable: boolean } }[];
  }[];
};

const USER_AGENT = "Recetra/0.1 (+https://recetra.vercel.app; precios para una pareja en Barranquilla)";
const MIN_INTERVAL_MS = 1_000;
const lastCall = new Map<string, number>();

/** At most one request per second per store. */
async function throttle(slug: string) {
  const wait = (lastCall.get(slug) ?? 0) + MIN_INTERVAL_MS - Date.now();
  lastCall.set(slug, Date.now() + Math.max(wait, 0));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function endpoint(store: VtexStore) {
  if (!store.base_url) throw new Error(`Store ${store.slug} has no base_url`);
  return `${store.base_url}${store.api_path_prefix ?? "/api"}/catalog_system/pub/products/search`;
}

async function get(store: VtexStore, query: string): Promise<RawProduct[]> {
  for (let attempt = 1; ; attempt++) {
    await throttle(store.slug);
    const res = await fetch(`${endpoint(store)}?${query}`, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    }).catch((error: unknown) => error as Error);
    if (!(res instanceof Error) && (res.ok || res.status === 206)) return (await res.json()) as RawProduct[];
    if (!(res instanceof Error) && res.status === 404) return [];
    if (attempt >= 3) throw new Error(`${store.slug} ${res instanceof Error ? res.message : res.status}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
  }
}

function normalize(raw: RawProduct): StoreProduct[] {
  return raw.items.flatMap((item) => {
    const offer = item.sellers[0]?.commertialOffer;
    if (!offer) return [];
    const price = Math.round(offer.Price);
    return [
      {
        sku: item.itemId,
        // Weighed goods ship several variants with one product name ("X KG" at $3.400, "X UND" at $340).
        name: raw.items.length > 1 && item.name ? `${raw.productName.trim()} · ${item.name.trim()}` : raw.productName.trim(),
        brand: raw.brand?.trim() || null,
        category: raw.categories?.[0] ?? null,
        priceCop: price,
        listPriceCop: offer.ListPrice && offer.ListPrice > price ? Math.round(offer.ListPrice) : null,
        available: offer.IsAvailable && price > 0,
        url: raw.link ?? null,
        imageUrl: item.images?.[0]?.imageUrl ?? null,
      },
    ];
  });
}

export async function searchProducts(store: VtexStore, text: string, limit = 20): Promise<StoreProduct[]> {
  // VTEX rejects "+" for spaces in ft (400): encode them as %20.
  const query = `ft=${encodeURIComponent(text)}&_from=0&_to=${Math.min(limit, 50) - 1}`;
  return (await get(store, query)).flatMap(normalize);
}

/** Current offers for known SKUs, 50 per request. */
export async function productsBySku(store: VtexStore, skus: string[]): Promise<StoreProduct[]> {
  const found: StoreProduct[] = [];
  for (let i = 0; i < skus.length; i += 50) {
    const chunk = skus.slice(i, i + 50);
    const query = [...chunk.map((sku) => `fq=skuId:${encodeURIComponent(sku)}`), "_from=0", "_to=49"].join("&");
    const wanted = new Set(chunk);
    found.push(...(await get(store, query)).flatMap(normalize).filter((p) => wanted.has(p.sku)));
  }
  return found;
}
