import type { Enums } from "@/lib/supabase/database.types";

export type MealType = Enums<"meal_type">;
export type Allergen = Enums<"allergen">;
export type Diet = Enums<"diet">;
export type IngredientCategory = Enums<"ingredient_category">;
export type ReplaceReason = Enums<"replace_reason">;

export type CandidateIngredient = {
  ingredientId: string;
  name: string;
  slug: string;
  category: IngredientCategory;
  allergens: Allergen[];
  role: "core" | "accessory";
  substituteIds: string[];
};

export type Candidate = {
  id: string;
  title: string;
  mealTypes: MealType[];
  minutes: number | null;
  styles: Enums<"recipe_style">[];
  equipment: Enums<"kitchen_equipment">[];
  ingredients: CandidateIngredient[];
  /** Estimated cost for the household's servings, COP. Null until prices exist (phase 2). */
  estimatedCost: number | null;
};

export type MemberProfile = {
  id: string;
  name: string;
  allergies: Allergen[];
  dislikeIngredientIds: string[];
  dislikeCategories: IngredientCategory[];
  diets: Diet[];
};

/** Accumulated reactions of one member to one recipe. */
export type ReactionSummary = {
  favorite: boolean;
  veto: boolean;
  /** Decayed preference score, see scoreFromReactions. */
  score: number;
};

export type PlanContext = {
  weekStart: string; // ISO date, Monday
  members: MemberProfile[];
  equipment: Enums<"kitchen_equipment">[];
  styles: Enums<"recipe_style">[];
  weeklyBudget: number | null;
  priceSensitivity: number;
  maxMinutesByMeal: Partial<Record<MealType, number>>;
  /** reactions[recipeId][memberId] */
  reactions: Record<string, Record<string, ReactionSummary>>;
  /** Days since each recipe was last cooked (only recent ones). */
  daysSinceCooked: Record<string, number>;
  seed: number;
  /** User choices and cooked slots are reserved before scoring any empty slots. */
  pinned?: Pick<PlannedMeal, "day" | "mealType" | "recipeId">[];
};

export type Adjustment = {
  ingredientId: string;
  ingredientName: string;
  /** Members who asked for it removed (dislike or diet). */
  memberNames: string[];
  substituteName: string | null;
};

export type PlannedMeal = {
  day: string; // ISO date
  mealType: MealType;
  recipeId: string | null;
  adjustments: Adjustment[];
  /** Why the slot is empty, when it is. */
  emptyReason: string | null;
};

export type Eligibility =
  | { ok: true; adjustments: Adjustment[] }
  | { ok: false; reason: "allergy" | "veto" | "diet" | "dislike" | "equipment" };
