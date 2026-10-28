import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { addDays, mondayOf } from "./week";

const contextSchema = z.object({ day: z.iso.date(), mealType: z.enum(Constants.public.Enums.meal_type) });
export type PlanSearchContext = z.infer<typeof contextSchema>;

/** Validate at request time in Search and recipe detail; never trust URL placement data. */
export function parsePlanContext(value: unknown, today: string): PlanSearchContext | null {
  if (typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const result = contextSchema.safeParse({ day: parts[0], mealType: parts[1] });
  if (!result.success || result.data.day < today || result.data.day > addDays(mondayOf(today), 13)) return null;
  return result.data;
}

export function planContextParam(context: PlanSearchContext) {
  return `${context.day}.${context.mealType}`;
}
