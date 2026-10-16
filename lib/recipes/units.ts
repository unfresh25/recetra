/** Normalizes free-form units from creators into something we can sum later. */
const UNIT_ALIASES: Record<string, string> = {
  g: "g", gr: "g", grs: "g", gramo: "g", gramos: "g",
  kg: "kg", kilo: "kg", kilos: "kg", kilogramo: "kg", kilogramos: "kg",
  ml: "ml", mililitro: "ml", mililitros: "ml",
  l: "l", lt: "l", litro: "l", litros: "l",
  lb: "lb", libra: "lb", libras: "lb",
  unidad: "unit", unidades: "unit", und: "unit", unds: "unit", unit: "unit", u: "unit",
  taza: "taza", tazas: "taza",
  cucharada: "cda", cucharadas: "cda", cda: "cda", cdas: "cda",
  cucharadita: "cdta", cucharaditas: "cdta", cdta: "cdta", cdtas: "cdta",
  diente: "diente", dientes: "diente",
  pizca: "pizca", pizcas: "pizca",
  "al gusto": "al gusto",
};

export function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const key = unit.trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[key] ?? key;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
