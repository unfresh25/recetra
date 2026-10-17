import { normalizeUnit } from "@/lib/recipes/units";

/** Turns recipe amounts ("2 cdas", "1 diente", "1 lb") into the unit a store sells the ingredient in. */
export type BuyUnit = "g" | "ml" | "unit";
export type Amount = { amount: number; unit: BuyUnit };
export type IngredientUnits = {
  name?: string;
  base_unit: BuyUnit;
  purchase_unit: BuyUnit | null;
  unit_weight_g: number | null;
  density_g_ml: number | null;
};

const MASS: Record<string, number> = { g: 1, kg: 1000, lb: 500, mg: 0.001, onza: 28.35, oz: 28.35 };
const VOLUME: Record<string, number> = {
  ml: 1, l: 1000, taza: 240, cda: 15, cdta: 5, copita: 30, copa: 150, vaso: 240, chorrito: 10, cucharón: 120, cucharon: 120,
};
// Pieces with a fairly fixed weight regardless of the ingredient.
const FIXED_PIECE_G: Record<string, number> = {
  diente: 5, dientes: 5, hoja: 1, hojas: 1, rama: 5, ramas: 5, ramita: 3, tallo: 30, tallos: 30, manojo: 50, atado: 50, puñado: 30,
};
const PIECES = new Set(["unit", "cabeza", "sobre", "lata", "paquete", "filete", "presa", "presas", "trozo", "trozos", "rodaja", "rodajas", "mazorca", "rack", "bolsa", "tarro", "barra", "tajada", "tajadas", "pechuga", "muslo", "mitad"]);
/** No measurable amount: listed, but not priced by quantity. */
const UNMEASURED = new Set(["al gusto", "pizca", "pizcas", "c/n", "cantidad necesaria"]);

export function toBuyAmount(quantity: number | null, rawUnit: string | null, ingredient: IngredientUnits): Amount | null {
  const unit = normalizeUnit(rawUnit) ?? "unit";
  if (quantity == null || quantity <= 0 || UNMEASURED.has(unit)) return null;
  const target = ingredient.purchase_unit ?? ingredient.base_unit;
  const density = ingredient.density_g_ml ?? 1;
  const pieceG = ingredient.unit_weight_g;

  let grams: number | null = null;
  let ml: number | null = null;
  let pieces: number | null = null;
  if (unit in MASS) grams = quantity * MASS[unit]!;
  else if (unit in VOLUME) ml = quantity * VOLUME[unit]!;
  else if (unit in FIXED_PIECE_G) grams = quantity * FIXED_PIECE_G[unit]!;
  else if (PIECES.has(unit)) pieces = quantity;
  else return null;

  // "1 litro de caldo de gallina" means prepared broth: one cube or sachet makes about 500 ml.
  if (target === "unit" && ml != null && /caldo|cubo|cubito/i.test(ingredient.name ?? "")) {
    return { amount: Math.max(1, Math.ceil(ml / 500)), unit: "unit" };
  }

  const round = (amount: number): Amount | null => (amount > 0 ? { amount: Math.round(amount * 100) / 100, unit: target } : null);
  if (target === "g") {
    if (grams != null) return round(grams);
    if (ml != null) return round(ml * density);
    return pieceG ? round(pieces! * pieceG) : null;
  }
  if (target === "ml") {
    if (ml != null) return round(ml);
    if (grams != null) return round(grams / density);
    return pieceG ? round((pieces! * pieceG) / density) : null;
  }
  if (pieces != null) return round(pieces);
  if (!pieceG) return null;
  return round((grams ?? ml! * density) / pieceG);
}
