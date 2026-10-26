/**
 * Kids need half a portion. Round up to keep enough food for everyone and store
 * a whole number of servings in plan_meals.servings (smallint).
 */
export function householdPortions({ adults, kids }: { adults: number; kids: number }): number {
  return adults + Math.ceil(kids / 2);
}
