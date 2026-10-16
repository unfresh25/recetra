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
  if (quantity === null) return unit ?? "";
  const q = Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString("es-CO", { maximumFractionDigits: 2 });
  const u = unit === "unit" ? "" : (unit ?? "");
  return `${q} ${u}`.trim();
}
