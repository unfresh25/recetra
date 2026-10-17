import type { IconName } from "@/components/ui/icon";
import type { Enums } from "@/lib/supabase/database.types";

export type Allergen = Enums<"allergen">;
export type Diet = Enums<"diet">;
export type RecipeStyle = Enums<"recipe_style">;
export type KitchenEquipment = Enums<"kitchen_equipment">;
export type IngredientCategory = Enums<"ingredient_category">;

type Option<T extends string> = { value: T; icon: IconName; label: string; description?: string };

export const ALLERGEN_OPTIONS: Option<Allergen>[] = [
  { value: "peanut", icon: "nut", label: "Maní" },
  { value: "tree_nut", icon: "nut", label: "Frutos secos" },
  { value: "dairy", icon: "milk", label: "Lácteos" },
  { value: "egg", icon: "egg", label: "Huevo" },
  { value: "gluten", icon: "wheat", label: "Gluten / trigo" },
  { value: "soy", icon: "bean", label: "Soya" },
  { value: "fish", icon: "fish", label: "Pescado" },
  { value: "shellfish", icon: "shrimp", label: "Mariscos" },
  { value: "sesame", icon: "plant", label: "Ajonjolí" },
];

export const DIET_OPTIONS: Option<Diet>[] = [
  { value: "vegetarian", icon: "carrot", label: "Vegetariana" },
  { value: "vegan", icon: "vegan", label: "Vegana" },
  { value: "pescatarian", icon: "fish", label: "Pescetariana" },
  { value: "gluten_free", icon: "wheat-off", label: "Sin gluten" },
  { value: "dairy_free", icon: "milk-off", label: "Sin lácteos" },
];

export const STYLE_OPTIONS: Option<RecipeStyle>[] = [
  { value: "quick", icon: "flash", label: "Rápido y fácil", description: "Listo en 20 min" },
  { value: "high_protein", icon: "dumbbell", label: "Alto en proteína", description: "Comidas energéticas" },
  { value: "healthy", icon: "salad", label: "Saludable", description: "Opciones saludables" },
  { value: "family", icon: "users", label: "Familiares", description: "Para toda la familia" },
  { value: "balanced", icon: "balance", label: "Equilibrado", description: "Carbohidratos, proteína y verduras" },
  { value: "low_calorie", icon: "scale", label: "Bajo en calorías", description: "Cenas más ligeras" },
  { value: "gut_friendly", icon: "leaf", label: "Amigable con el intestino", description: "Opciones nutritivas" },
  { value: "one_pot", icon: "pot", label: "Todo en una olla", description: "Menos platos, mismo sabor" },
];

export const MAX_STYLES = 3;

export const EQUIPMENT_OPTIONS: Option<KitchenEquipment>[] = [
  { value: "stovetop", icon: "stove", label: "Estufa" },
  { value: "oven", icon: "oven", label: "Horno" },
  { value: "microwave", icon: "microwave", label: "Microondas" },
  { value: "air_fryer", icon: "fan", label: "Freidora de aire" },
  { value: "pressure_cooker", icon: "pot", label: "Olla a presión" },
  { value: "slow_cooker", icon: "kettle", label: "Olla de cocción lenta" },
  { value: "blender", icon: "blender", label: "Licuadora" },
  { value: "rice_cooker", icon: "rice-bowl", label: "Arrocera" },
];

/** Quick picks for "¿Algo que no comas?". Categories cover every ingredient in them. */
export const COMMON_DISLIKES: ({ kind: "ingredient"; slug: string } | { kind: "category"; value: IngredientCategory; label: string; icon: IconName })[] = [
  { kind: "ingredient", slug: "cilantro" },
  { kind: "category", value: "seafood", label: "Mariscos", icon: "shrimp" },
  { kind: "category", value: "fish", label: "Pescado", icon: "fish" },
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
