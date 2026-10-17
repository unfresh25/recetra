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
      visibility: "household",
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

type SeedRecipe = {
  title: string;
  meal: "breakfast" | "lunch" | "dinner";
  minutes: number;
  ingredients: { slug: string; role?: "core" | "accessory"; quantity?: number; unit?: string }[];
};

/** Approved public recipes the plan engine can choose from. Returns title -> id. */
export async function seedCatalog(recipes: SeedRecipe[]) {
  const { rest: db } = adminDb();
  const slugs = [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.slug)))];
  const { data: ingredients } = await db.from("ingredients").select("id, slug").in("slug", slugs);
  const idOf = (slug: string) => (ingredients as { id: string; slug: string }[]).find((i) => i.slug === slug)!.id;
  const ids: Record<string, string> = {};
  const run = Date.now().toString(36);
  for (const [n, r] of recipes.entries()) {
    const { data, error } = await db
      .from("recipes")
      .insert({
        title: r.title,
        source_platform: "youtube",
        source_video_id: `s${run}${n}`.slice(0, 20),
        author_name: "Recetra E2E",
        servings: 2,
        total_minutes: r.minutes,
        kcal_per_serving: 500,
        meal_types: [r.meal],
        status: "approved",
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = (data as { id: string }).id;
    ids[r.title] = id;
    await db.from("recipe_ingredients").insert(
      r.ingredients.map((i, p) => ({
        recipe_id: id,
        position: p + 1,
        ingredient_id: idOf(i.slug),
        quantity: i.quantity ?? 100,
        unit: i.unit ?? "g",
        role: i.role ?? "core",
      })),
    );
    await db.from("recipe_steps").insert([
      { recipe_id: id, position: 1, text: "Pica todo y calienta la olla." },
      { recipe_id: id, position: 2, text: "Cocina a fuego medio por 10 minutos." },
    ]);
  }
  return ids;
}

/** Recipe ids planned for a member's household this week. */
export async function plannedRecipeIds(email: string) {
  const { rest: db, userIdByEmail } = adminDb();
  const userId = await userIdByEmail(email);
  const { data: member } = await db.from("members").select("household_id").eq("user_id", userId).single();
  const { data: plans } = await db.from("meal_plans").select("id").eq("household_id", (member as { household_id: string }).household_id);
  const planIds = (plans as { id: string }[]).map((p) => p.id);
  const { data: meals } = await db.from("plan_meals").select("recipe_id").in("meal_plan_id", planIds);
  return (meals as { recipe_id: string | null }[]).map((m) => m.recipe_id);
}

/** Removes catalog rows created by previous E2E runs so the plan engine sees a predictable catalog. */
export async function cleanE2ECatalog() {
  const { rest: db } = adminDb();
  await db.from("recipes").delete().eq("author_name", "Recetra E2E");
  await db.from("recipes").delete().eq("author_name", "Tatán Arroyo");
}

/**
 * One product per (ingredient, store) for every ingredient in approved recipes, priced so that
 * D1 wins grains and Olímpica wins proteins: the list then has a reason to split the trip.
 */
export async function seedStorePrices(storeSlugs: string[]) {
  const { rest: db } = adminDb();
  const { data: stores } = await db.from("stores").select("id, slug").in("slug", storeSlugs);
  const { data: lines } = await db.from("recipe_ingredients").select("ingredients (id, slug, category, base_unit)");
  const ingredients = new Map(
    ((lines ?? []) as unknown as { ingredients: { id: string; slug: string; category: string; base_unit: "g" | "ml" | "unit" } }[]).map((l) => [l.ingredients.id, l.ingredients]),
  );
  const protein = new Set(["meat", "poultry", "fish", "seafood", "eggs"]);
  for (const store of (stores ?? []) as { id: string; slug: string }[]) {
    for (const ingredient of ingredients.values()) {
      const qty = ingredient.base_unit === "unit" ? 10 : 1000;
      const cheaperHere = protein.has(ingredient.category) === (store.slug === "olimpica");
      const { data: product, error } = await db
        .from("products")
        .upsert(
          { store_id: store.id, sku: `e2e-${ingredient.slug}`, name: `${ingredient.slug} ${store.slug} ${qty}`, brand: `Marca ${store.slug}`, package_qty: qty, package_unit: ingredient.base_unit },
          { onConflict: "store_id,sku" },
        )
        .select("id")
        .single();
      if (error) throw error;
      const productId = (product as { id: string }).id;
      await db.from("product_matches").upsert({ ingredient_id: ingredient.id, product_id: productId, confidence: 0.9, status: "auto" }, { onConflict: "ingredient_id,product_id" });
      await db.from("prices").insert({ product_id: productId, price_cop: cheaperHere ? 4000 : 6000 });
    }
  }
}

/** An OSM-style branch near Barranquilla's Paseo Bolívar, so the stores tab has something to show. */
export async function seedBranch(storeSlug: string, name: string, lat: number, lng: number) {
  const { rest: db } = adminDb();
  const { data: store } = await db.from("stores").select("id").eq("slug", storeSlug).single();
  await db.from("branches").upsert(
    { store_id: (store as { id: string }).id, name, lat, lng, source: "osm", osm_id: `e2e/${storeSlug}-${lat}` },
    { onConflict: "osm_id" },
  );
}
