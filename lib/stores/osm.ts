/** Supermarket branches around Barranquilla from OpenStreetMap (Overpass API). */
export type OsmBranch = { osmId: string; storeSlug: string; name: string; address: string | null; lat: number; lng: number };

// Barranquilla, Soledad, Puerto Colombia, Malambo and Galapa.
const BBOX = "10.85,-74.95,11.10,-74.70";
const QUERY = `[out:json][timeout:90];
nwr["shop"~"^(supermarket|convenience|wholesale|department_store)$"](${BBOX});
out center tags;`;

// The main instance sometimes answers 406 to automated clients; mirrors serve the same data.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** Which chain a shop belongs to, from its brand, name or operator tags. */
const CHAINS: [slug: string, pattern: RegExp][] = [
  ["exito", /(^|[^a-záéíóú])[ée]xito\b/i],
  ["carulla", /\bcarulla\b/i],
  ["olimpica", /\bol[ií]mpica\b|\bsao\b/i],
  ["d1", /^d1\b|\btiendas d1\b|\bd1\s*$/i],
  ["ara", /^ara\b|\btiendas ara\b/i],
  ["megatiendas", /\bmega\s?tiendas\b/i],
  ["jumbo", /\bjumbo\b/i],
  ["makro", /\bmakro\b/i],
  ["isimo", /\bisimo\b/i],
];

export function chainOf(tags: Record<string, string>): string | null {
  for (const value of [tags.brand, tags.name, tags.operator]) {
    if (!value) continue;
    for (const [slug, pattern] of CHAINS) if (pattern.test(value.trim())) return slug;
  }
  return null;
}

function address(tags: Record<string, string>) {
  const street = tags["addr:street"] ? `${tags["addr:street"]}${tags["addr:housenumber"] ? ` # ${tags["addr:housenumber"]}` : ""}` : tags["addr:full"];
  return [street, tags["addr:city"]].filter(Boolean).join(", ") || null;
}

export type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** Branches from an Overpass JSON response. */
export function parseBranches(elements: Element[]): OsmBranch[] {
  return elements.flatMap((e) => {
    const tags = e.tags ?? {};
    const slug = chainOf(tags);
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (!slug || lat == null || lng == null) return [];
    return [{ osmId: `${e.type}/${e.id}`, storeSlug: slug, name: (tags.name ?? tags.brand ?? slug).trim(), address: address(tags), lat, lng }];
  });
}

export async function fetchBranches(): Promise<OsmBranch[]> {
  let lastError: unknown;
  for (const endpoint of ENDPOINTS.flatMap((e) => [e, e])) {
    if (lastError) await new Promise((resolve) => setTimeout(resolve, 10_000));
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "user-agent": "Recetra/0.1 (+https://recetra.vercel.app)", "content-type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(QUERY)}`,
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
      const { elements } = (await res.json()) as { elements: Element[] };
      return parseBranches(elements);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
