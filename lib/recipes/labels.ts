import type { Enums } from "@/lib/supabase/database.types";

export const MEAL_TYPE_LABELS: Record<Enums<"meal_type">, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
};

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export const PLATFORM_LABELS: Record<Enums<"source_platform">, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  manual: "Receta propia",
};

export function formatQuantity(quantity: number | null, unit: string | null) {
  if (unit === "al gusto") return "al gusto";
  const u = unit === "unit" ? "unid." : (unit ?? "");
  if (quantity === null) return u;
  let q = Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString("es-CO", { maximumFractionDigits: 2 });
  if (unit === "unit") {
    const fraction = new Map([[0.25, "¼"], [0.5, "½"], [0.75, "¾"]]).get(quantity % 1);
    if (fraction) q = `${Math.trunc(quantity) || ""}${fraction}`;
  }
  return `${q} ${u}`.trim();
}
