/** Use the same rounding in recipe detail and cook mode. */
export function scaleQuantity(quantity: number | null, factor: number) {
  if (quantity === null) return null;
  const value = quantity * factor;
  return value >= 10 ? Math.round(value) : Math.round(value * 4) / 4;
}

export function parseServings(value: string | string[] | undefined, fallback: number) {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const servings = Number(value);
    if (Number.isInteger(servings) && servings >= 1 && servings <= 20) return servings;
  }
  return Math.min(20, Math.max(1, fallback));
}

export function withServings(href: string, servings: number) {
  const [path, query] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("servings", String(servings));
  return `${path}?${params}`;
}
