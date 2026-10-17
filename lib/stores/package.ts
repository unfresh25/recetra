/** Reads the package size from a store product name ("Arroz Diana 500 G", "Huevos x 30 unds"). */
export type Package = { qty: number; unit: "g" | "ml" | "unit" };

const UNITS: Record<string, { unit: Package["unit"]; factor: number }> = {
  g: { unit: "g", factor: 1 }, gr: { unit: "g", factor: 1 }, grs: { unit: "g", factor: 1 }, gramos: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 }, kilo: { unit: "g", factor: 1000 }, kilos: { unit: "g", factor: 1000 },
  lb: { unit: "g", factor: 500 }, libra: { unit: "g", factor: 500 }, libras: { unit: "g", factor: 500 },
  ml: { unit: "ml", factor: 1 }, cc: { unit: "ml", factor: 1 },
  l: { unit: "ml", factor: 1000 }, lt: { unit: "ml", factor: 1000 }, lts: { unit: "ml", factor: 1000 }, litro: { unit: "ml", factor: 1000 }, litros: { unit: "ml", factor: 1000 },
  und: { unit: "unit", factor: 1 }, unds: { unit: "unit", factor: 1 }, un: { unit: "unit", factor: 1 }, unidad: { unit: "unit", factor: 1 }, unidades: { unit: "unit", factor: 1 },
};

// "2.500 G" is 2500 g in Colombian notation; "1,5 kg" and "1.5 kg" are one and a half.
function toNumber(raw: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ""));
  return Number(raw.replace(",", "."));
}

const PACKAGE = /(\d+(?:[.,]\d+)*)\s*(kg|kilos?|grs?|gramos|g|lbs?|libras?|ml|cc|lts?|litros?|l|unds?|unidad(?:es)?|un)\b/gi;
const MULTI = /(\d+)\s*(?:x|un(?:ds?|idades)?\s*x|und\s*de)\s*(\d+(?:[.,]\d+)?)\s*(kg|grs?|g|ml|l)\b/i;

export function parsePackage(name: string): Package | null {
  const text = name.toLowerCase().replace(/\s+/g, " ");
  // Multipacks: "6 x 200 ml", "pague 2 lleve 3" is ignored on purpose.
  const multi = text.match(MULTI);
  if (multi) {
    const spec = UNITS[multi[3]!]!;
    return { qty: Number(multi[1]) * toNumber(multi[2]!) * spec.factor, unit: spec.unit };
  }
  // The last size mentioned wins: "Leche (Bolsa) 1100 ml" or "Arroz x 500 g".
  let found: Package | null = null;
  for (const match of text.matchAll(PACKAGE)) {
    const spec = UNITS[match[2]!] ?? UNITS[match[2]!.replace(/s$/, "")];
    if (!spec) continue;
    const qty = toNumber(match[1]!) * spec.factor;
    if (qty > 0) found = { qty: Math.round(qty * 100) / 100, unit: spec.unit };
  }
  return found;
}
