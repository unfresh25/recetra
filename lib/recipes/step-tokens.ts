import type { IconName } from "@/components/ui/icon";

export type StepToken =
  | { kind: "text"; text: string }
  | { kind: "ingredient"; text: string; index: number }
  | { kind: "tool"; text: string; icon: IconName }
  | { kind: "time"; text: string; seconds: number }
  | { kind: "temperature"; text: string }
  | { kind: "heat"; text: string };

/** Kitchen tools we can draw an icon for. Longer names first so "olla a presión" beats "olla". */
const TOOLS: [string[], IconName][] = [
  [["olla a presión", "olla exprés", "olla express"], "pot"],
  [["freidora de aire", "air fryer", "freidora"], "fan"],
  [["sartén", "sarten", "paila", "wok"], "pan"],
  [["olla", "caldero", "cacerola", "cazuela", "ollita"], "pot"],
  [["cuchillo", "cuchilla"], "knife"],
  [["licuadora", "procesador", "procesadora"], "blender"],
  [["batidora"], "mixer"],
  [["batidor", "molinillo"], "whisk"],
  [["horno"], "oven"],
  [["microondas"], "microwave"],
  [["arrocera"], "rice-bowl"],
  [["espátula", "espatula", "paleta"], "spatula"],
  [["cucharón", "cuchara de palo", "cuchara", "cucharita"], "spoon"],
  [["tazón", "bowl", "recipiente", "refractario", "molde", "bandeja"], "rice-bowl"],
  [["plato", "platos"], "plate"],
  [["frasco", "jarra", "vaso"], "jar"],
  [["estufa", "fogón", "fogon"], "stove"],
];

const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const TIME = /(\d+(?:[.,]\d+)?)(?:\s*(?:a|-|–|o)\s*(\d+(?:[.,]\d+)?))?\s*(minutos?|min\b\.?|horas?|hrs?\b|segundos?|seg\b\.?)/gi;
const TEMPERATURE = /\d{2,3}\s*(?:°|º|grados)\s*(?:c\b|f\b|centígrados|celsius)?/gi;
const HEAT = /fuego (?:muy )?(?:alto|medio[- ]alto|medio[- ]bajo|medio|bajo|lento|fuerte|suave)/gi;

function toSeconds(value: string, unit: string) {
  const n = Number(value.replace(",", "."));
  const u = unit.toLowerCase();
  if (u.startsWith("h")) return Math.round(n * 3600);
  if (u.startsWith("s")) return Math.round(n);
  return Math.round(n * 60);
}

type Match = { start: number; end: number; token: StepToken };

/**
 * Splits a step into text, ingredients (from this recipe), tools, times, temperatures and heat levels.
 * Matching is accent- and case-insensitive; plurals of ingredient names are accepted.
 */
export function tokenizeStep(text: string, ingredientNames: string[][]): StepToken[] {
  const lower = strip(text);
  const matches: Match[] = [];

  const push = (start: number, end: number, token: StepToken) => {
    if (matches.some((m) => start < m.end && end > m.start)) return; // first (higher priority) wins
    matches.push({ start, end, token });
  };

  for (const m of text.matchAll(TIME)) {
    // For ranges ("10 a 15 minutos") the timer uses the upper value.
    push(m.index!, m.index! + m[0].length, { kind: "time", text: m[0], seconds: Math.max(toSeconds(m[1]!, m[3]!), toSeconds(m[2] ?? m[1]!, m[3]!)) });
  }
  for (const m of text.matchAll(TEMPERATURE)) push(m.index!, m.index! + m[0].length, { kind: "temperature", text: m[0] });
  for (const m of text.matchAll(HEAT)) push(m.index!, m.index! + m[0].length, { kind: "heat", text: m[0] });

  const findWord = (needle: string, cb: (start: number, end: number) => void) => {
    const n = strip(needle);
    if (n.length < 3) return;
    const re = new RegExp(`(?<![\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:es|s)?(?![\\p{L}])`, "gu");
    for (const m of lower.matchAll(re)) cb(m.index!, m.index! + m[0].length);
  };

  for (const [names, icon] of TOOLS) {
    for (const name of names) findWord(name, (s, e) => push(s, e, { kind: "tool", text: text.slice(s, e), icon }));
  }

  // Longest names first, so "cebolla larga" wins over "cebolla".
  const ingredients = ingredientNames
    .flatMap((names, index) => names.map((name) => ({ name, index })))
    .sort((a, b) => b.name.length - a.name.length);
  for (const { name, index } of ingredients) {
    findWord(name, (s, e) => push(s, e, { kind: "ingredient", text: text.slice(s, e), index }));
  }

  matches.sort((a, b) => a.start - b.start);
  const tokens: StepToken[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) tokens.push({ kind: "text", text: text.slice(cursor, m.start) });
    tokens.push(m.token);
    cursor = m.end;
  }
  if (cursor < text.length) tokens.push({ kind: "text", text: text.slice(cursor) });
  return tokens;
}

export function formatDuration(seconds: number) {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`;
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds} s`;
}

/** Ingredients stay plain in the step text; their matches still power the cards. */
export function stepTokenIcon(token: StepToken): IconName | null {
  switch (token.kind) {
    case "tool": return token.icon;
    case "time": return "timer";
    case "temperature": return "thermometer";
    case "heat": return "fire";
    default: return null;
  }
}

export function stepIngredientIndexes(tokens: StepToken[]) {
  return [...new Set(tokens.flatMap((token) => token.kind === "ingredient" ? [token.index] : []))];
}
