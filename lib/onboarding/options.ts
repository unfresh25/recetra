import type { Enums } from "@/lib/supabase/database.types";

export type Allergen = Enums<"allergen">;
export type Diet = Enums<"diet">;
export type RecipeStyle = Enums<"recipe_style">;
export type KitchenEquipment = Enums<"kitchen_equipment">;
export type IngredientCategory = Enums<"ingredient_category">;

type Option<T extends string> = { value: T; emoji: string; label: string; description?: string };

export const ALLERGEN_OPTIONS: Option<Allergen>[] = [
  { value: "peanut", emoji: "🥜", label: "Maní" },
  { value: "tree_nut", emoji: "🌰", label: "Frutos secos" },
  { value: "dairy", emoji: "🥛", label: "Lácteos" },
  { value: "egg", emoji: "🥚", label: "Huevo" },
  { value: "gluten", emoji: "🌾", label: "Gluten / trigo" },
  { value: "soy", emoji: "🫘", label: "Soya" },
  { value: "fish", emoji: "🐟", label: "Pescado" },
  { value: "shellfish", emoji: "🦐", label: "Mariscos" },
  { value: "sesame", emoji: "🥯", label: "Ajonjolí" },
];

export const DIET_OPTIONS: Option<Diet>[] = [
  { value: "vegetarian", emoji: "🥕", label: "Vegetariana" },
  { value: "vegan", emoji: "🌱", label: "Vegana" },
  { value: "pescatarian", emoji: "🐟", label: "Pescetariana" },
  { value: "gluten_free", emoji: "🌾", label: "Sin gluten" },
  { value: "dairy_free", emoji: "🥛", label: "Sin lácteos" },
];

export const STYLE_OPTIONS: Option<RecipeStyle>[] = [
  { value: "quick", emoji: "⚡", label: "Rápido y fácil", description: "Listo en 20 min" },
  { value: "high_protein", emoji: "💪", label: "Alto en proteína", description: "Comidas energéticas" },
  { value: "healthy", emoji: "🥗", label: "Saludable", description: "Opciones saludables" },
  { value: "family", emoji: "👨‍👩‍👧", label: "Familiares", description: "Para toda la familia" },
  { value: "balanced", emoji: "🍽️", label: "Equilibrado", description: "Carbohidratos, proteína y verduras" },
  { value: "low_calorie", emoji: "⚖️", label: "Bajo en calorías", description: "Cenas más ligeras" },
  { value: "gut_friendly", emoji: "💚", label: "Amigable con el intestino", description: "Opciones nutritivas" },
  { value: "one_pot", emoji: "🍲", label: "Todo en una olla", description: "Menos platos, mismo sabor" },
];

export const MAX_STYLES = 3;

export const EQUIPMENT_OPTIONS: Option<KitchenEquipment>[] = [
  { value: "stovetop", emoji: "🍳", label: "Estufa" },
  { value: "oven", emoji: "🔥", label: "Horno" },
  { value: "microwave", emoji: "📡", label: "Microondas" },
  { value: "air_fryer", emoji: "🌀", label: "Freidora de aire" },
  { value: "pressure_cooker", emoji: "♨️", label: "Olla a presión" },
  { value: "slow_cooker", emoji: "🥘", label: "Olla de cocción lenta" },
  { value: "blender", emoji: "🥤", label: "Licuadora" },
  { value: "rice_cooker", emoji: "🍚", label: "Arrocera" },
];

/** Quick picks for "¿Algo que no comas?". Categories cover every ingredient in them. */
export const COMMON_DISLIKES: ({ kind: "ingredient"; slug: string } | { kind: "category"; value: IngredientCategory; label: string; emoji: string })[] = [
  { kind: "ingredient", slug: "cilantro" },
  { kind: "category", value: "seafood", label: "Mariscos", emoji: "🦐" },
  { kind: "category", value: "fish", label: "Pescado", emoji: "🐟" },
  { kind: "ingredient", slug: "cebolla-cabezona" },
  { kind: "ingredient", slug: "champinon" },
  { kind: "ingredient", slug: "berenjena" },
  { kind: "ingredient", slug: "higado-res" },
  { kind: "ingredient", slug: "aguacate" },
  { kind: "ingredient", slug: "aji-picante" },
  { kind: "ingredient", slug: "coco" },
  { kind: "ingredient", slug: "pimenton-rojo" },
  { kind: "ingredient", slug: "ajo" },
];

export const CATEGORY_LABELS: Partial<Record<IngredientCategory, string>> = {
  seafood: "Mariscos",
  fish: "Pescado",
  meat: "Carnes rojas y cerdo",
  poultry: "Pollo",
};

export const BUDGET = { min: 80_000, max: 800_000, step: 10_000, default: 250_000 } as const;

export function budgetTier(cop: number) {
  if (cop < 150_000) return { label: "Básico", description: "Básicos inteligentes, comidas simples" };
  if (cop < 300_000) return { label: "Moderado", description: "Variedad sin excesos" };
  if (cop < 500_000) return { label: "Holgado", description: "Más proteína y algún antojo" };
  return { label: "Generoso", description: "Lo que se les antoje" };
}

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function formatCop(value: number) {
  return cop.format(value).replace(/\s/g, "");
}
