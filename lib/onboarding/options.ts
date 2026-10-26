import type { IconName } from "@/components/ui/icon";
import type { Enums } from "@/lib/supabase/database.types";

export type Allergen = Enums<"allergen">;
export type Diet = Enums<"diet">;
export type RecipeStyle = Enums<"recipe_style">;
export type KitchenEquipment = Enums<"kitchen_equipment">;
export type IngredientCategory = Enums<"ingredient_category">;

type Option<T extends string> = { value: T; icon: IconName; label: string; description?: string };

export const ALLERGEN_OPTIONS: (Option<Allergen> & { image: string })[] = [
  { value: "peanut", icon: "nut", image: "/images/allergies/peanut.webp", label: "Maní" },
  { value: "tree_nut", icon: "nut", image: "/images/allergies/tree_nut.webp", label: "Frutos secos" },
  { value: "dairy", icon: "milk", image: "/images/allergies/dairy.webp", label: "Lácteos" },
  { value: "egg", icon: "egg", image: "/images/allergies/egg.webp", label: "Huevo" },
  { value: "gluten", icon: "wheat", image: "/images/allergies/gluten.webp", label: "Gluten / Trigo" },
  { value: "soy", icon: "bean", image: "/images/allergies/soy.webp", label: "Soya" },
  { value: "fish", icon: "fish", image: "/images/allergies/fish.webp", label: "Pescados" },
  { value: "shellfish", icon: "shrimp", image: "/images/allergies/shellfish.webp", label: "Mariscos" },
  { value: "sesame", icon: "plant", image: "/images/allergies/sesame.webp", label: "Ajonjolí" },
];

export const DIET_OPTIONS: (Option<Diet> & { image: string })[] = [
  { value: "vegan", icon: "vegan", label: "Vegana", image: "/images/diets/vegan.webp" },
  { value: "vegetarian", icon: "carrot", label: "Vegetariana", image: "/images/diets/vegetarian.webp" },
  { value: "pescatarian", icon: "fish", label: "Pescetariana", image: "/images/diets/pescatarian.webp" },
  { value: "paleo", icon: "carrot", label: "Paleo", image: "/images/diets/paleo.webp" },
  { value: "low_carb", icon: "salad", label: "Bajo-carbo", image: "/images/diets/low_carb.webp" },
  { value: "keto", icon: "salad", label: "Keto", image: "/images/diets/keto.webp" },
];

export const STYLE_OPTIONS: (Option<RecipeStyle> & { image: string })[] = [
  { value: "quick", icon: "flash", image: "/images/styles/quick.webp", label: "Rápido y fácil", description: "Listo en 20 min" },
  { value: "high_protein", icon: "dumbbell", image: "/images/styles/high_protein.webp", label: "Alto en proteína", description: "Comidas energéticas" },
  { value: "healthy", icon: "salad", image: "/images/styles/healthy.webp", label: "Saludable", description: "Opciones saludables" },
  { value: "family", icon: "users", image: "/images/styles/family.webp", label: "Familiares", description: "Para toda la familia" },
  { value: "balanced", icon: "balance", image: "/images/styles/balanced.webp", label: "Equilibrado", description: "Carbohidratos, proteína y verduras" },
  { value: "low_calorie", icon: "scale", image: "/images/styles/low_calorie.webp", label: "Bajo en calorías", description: "Cenas más ligeras" },
  { value: "gut_friendly", icon: "leaf", image: "/images/styles/gut_friendly.webp", label: "Amigable con el intestino", description: "Opciones nutritivas" },
  { value: "one_pot", icon: "pot", image: "/images/styles/one_pot.webp", label: "Todo en una olla", description: "Menos platos, mismo sabor" },
];

export const MAX_STYLES = 3;

export const EQUIPMENT_OPTIONS: (Option<KitchenEquipment> & { image: string })[] = [
  { value: "stovetop", icon: "stove", image: "/images/kitchen/stovetop.webp", label: "Estufa" },
  { value: "oven", icon: "oven", image: "/images/kitchen/oven.webp", label: "Horno" },
  { value: "microwave", icon: "microwave", image: "/images/kitchen/microwave.webp", label: "Microondas" },
  { value: "air_fryer", icon: "fan", image: "/images/kitchen/air_fryer.webp", label: "Freidora de aire" },
  { value: "pressure_cooker", icon: "pot", image: "/images/kitchen/pressure_cooker.webp", label: "Olla a presión" },
  { value: "slow_cooker", icon: "kettle", image: "/images/kitchen/slow_cooker.webp", label: "Olla de cocción lenta" },
  { value: "blender", icon: "blender", image: "/images/kitchen/blender.webp", label: "Licuadora" },
  { value: "rice_cooker", icon: "rice-bowl", image: "/images/kitchen/rice_cooker.webp", label: "Arrocera" },
];

/** Quick picks for "¿Algún ingrediente que no comas?". Categories cover every ingredient in them. */
export const COMMON_DISLIKES: ({ kind: "ingredient"; slug: string; label?: string } | { kind: "category"; value: IngredientCategory; label: string; icon: IconName })[] = [
  { kind: "category", value: "seafood", label: "Mariscos", icon: "shrimp" },
  { kind: "ingredient", slug: "cilantro", label: "Cilantro" },
  { kind: "category", value: "fish", label: "Pescado", icon: "fish" },
  { kind: "ingredient", slug: "champinon", label: "Champiñones" },
  { kind: "ingredient", slug: "berenjena", label: "Berenjena" },
  { kind: "ingredient", slug: "higado-res", label: "Hígado" },
  { kind: "ingredient", slug: "coco", label: "Coco" },
  { kind: "ingredient", slug: "pimenton-rojo", label: "Pimentón" },
  { kind: "ingredient", slug: "ajo", label: "Ajo" },
  { kind: "ingredient", slug: "aguacate", label: "Aguacate" },
  { kind: "ingredient", slug: "cebolla-cabezona", label: "Cebolla" },
  { kind: "ingredient", slug: "aji-picante", label: "Ají picante" },
  { kind: "ingredient", slug: "huevo", label: "Huevo" },
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

export function formatCopK(cop: number): string {
  return `$${Math.round(cop / 1_000)}k`;
}
