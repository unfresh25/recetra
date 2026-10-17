import type { BuyUnit } from "./units";

const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/** "1,2 kg", "750 ml", "6 und". */
export function formatAmount(amount: number | null, unit: BuyUnit): string | null {
  if (amount == null) return null;
  if (unit === "g") return amount >= 1000 ? `${decimal.format(amount / 1000)} kg` : `${Math.round(amount)} g`;
  if (unit === "ml") return amount >= 1000 ? `${decimal.format(amount / 1000)} L` : `${Math.round(amount)} ml`;
  const pieces = Math.ceil(amount * 2) / 2;
  return `${decimal.format(pieces)} und`;
}

export function daysAgo(iso: string, now = Date.now()) {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

/** Supermarket aisles, in walking order. */
export const AISLES: { label: string; categories: string[] }[] = [
  { label: "Frutas y verduras", categories: ["produce", "herbs"] },
  { label: "Carnes, pollo y pescado", categories: ["meat", "poultry", "fish", "seafood"] },
  { label: "Lácteos y huevos", categories: ["dairy", "eggs"] },
  { label: "Panadería", categories: ["bakery"] },
  { label: "Granos y despensa", categories: ["grains", "legumes", "pantry", "nuts_seeds"] },
  { label: "Salsas, aceites y especias", categories: ["condiments", "oils", "spices", "sweeteners"] },
  { label: "Bebidas y otros", categories: ["beverages", "other"] },
];
