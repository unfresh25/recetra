import { readFileSync } from "node:fs";
import { PostgrestClient } from "@supabase/postgrest-js";

function localEnv() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
      }),
  ) as Record<string, string>;
}

/** Service-role REST client for test fixtures (no realtime, so it runs on Node 20). */
export function adminDb() {
  const env = localEnv();
  const headers = { apikey: env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` };
  return {
    rest: new PostgrestClient(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`, { headers }),
    async userIdByEmail(email: string) {
      const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers });
      const body = (await res.json()) as { users: { id: string; email: string }[] };
      return body.users.find((u) => u.email === email)!.id;
    },
  };
}

/** Inserts an imported-but-unreviewed recipe for the household of `email`. */
export async function seedDraftRecipe(email: string) {
  const { rest: db, userIdByEmail } = adminDb();
  const userId = await userIdByEmail(email);
  const { data: member } = await db.from("members").select("household_id").eq("user_id", userId).single();
  const { data: ingredients } = await db.from("ingredients").select("id, slug").in("slug", ["arroz-blanco", "chorizo", "huevo", "cebolla-larga"]);
  const id = (slug: string) => (ingredients as { id: string; slug: string }[]).find((i) => i.slug === slug)!.id;

  const { data: recipe, error } = await db
    .from("recipes")
    .insert({
      title: "Arroz con todo de chorizo y huevo",
      source_platform: "youtube",
      source_video_id: `e2e${Date.now()}`.slice(0, 11),
      source_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      author_name: "Tatán Arroyo",
      servings: 2,
      total_minutes: 20,
      kcal_per_serving: 780,
      protein_g: 32,
      carbs_g: 85,
      fat_g: 30,
      meal_types: ["breakfast"],
      imported_by_household_id: (member as { household_id: string }).household_id,
      status: "pending_review",
      ai_confidence: 0.9,
    })
    .select("id")
    .single();
  if (error) throw error;
  await db.from("recipe_ingredients").insert([
    { recipe_id: (recipe as { id: string }).id, position: 1, ingredient_id: id("arroz-blanco"), quantity: 270, unit: "g", role: "core", note: "del día anterior" },
    { recipe_id: (recipe as { id: string }).id, position: 2, ingredient_id: id("chorizo"), quantity: 120, unit: "g", role: "core" },
    { recipe_id: (recipe as { id: string }).id, position: 3, ingredient_id: id("huevo"), quantity: 2, unit: "unit", role: "core" },
    { recipe_id: (recipe as { id: string }).id, position: 4, ingredient_id: id("cebolla-larga"), quantity: 1, unit: "unit", role: "accessory", note: "picada" },
  ]);
  await db.from("recipe_steps").insert([
    { recipe_id: (recipe as { id: string }).id, position: 1, text: "Fríe el chorizo en trozos." },
    { recipe_id: (recipe as { id: string }).id, position: 2, text: "Agrega el arroz y saltea." },
    { recipe_id: (recipe as { id: string }).id, position: 3, text: "Incorpora los huevos revueltos." },
  ]);
  return (recipe as { id: string }).id;
}
