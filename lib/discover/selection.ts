import { todayInBogota } from "@/lib/plan/week";

/** Same eligible ids and Bogotá calendar day always produce the same pick. */
export function recipeOfTheDay<T extends { id: string }>(recipes: readonly T[], now = new Date()): T | null {
  if (!recipes.length) return null;
  const sorted = [...recipes].sort((a, b) => a.id.localeCompare(b.id));
  let hash = 2166136261;
  for (const character of todayInBogota(now)) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return sorted[hash % sorted.length]!;
}
