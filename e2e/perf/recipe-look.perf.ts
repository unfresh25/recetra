import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { adminDb } from "../db";
import { createHousehold, householdSetup, personalSetup, signIn } from "../flows";

// Visual check of the recipe detail with a real cover (not a CI test).
test("recipe detail look", async ({ page }) => {
  test.setTimeout(120_000);
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
  const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  const { rest: db } = adminDb();
  const path = `recipes/look-${Date.now()}.webp`;
  for (const p of [path, path.replace(".webp", "-thumb.webp")]) {
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/recipe-images/${p}`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "image/webp" },
      body: readFileSync("public/illustrations/welcome-plan.webp"),
    });
  }
  const { data: ings } = await db.from("ingredients").select("id, slug").in("slug", ["arroz-blanco", "pechuga-pollo", "cebolla-larga", "zanahoria", "cilantro"]);
  const id_ = (s: string) => (ings as { id: string; slug: string }[]).find((i) => i.slug === s)!.id;
  await db.from("recipes").delete().eq("source_video_id", "6s5qpxYVht0");
  const { data: r } = await db.from("recipes").insert({
    title: "Arroz con pollo de la abuela", source_platform: "youtube", source_video_id: "6s5qpxYVht0", author_name: "Recetra E2E",
    source_url: "https://youtu.be/6s5qpxYVht0", source_image_path: path, servings: 4, total_minutes: 45, kcal_per_serving: 520,
    protein_g: 32, carbs_g: 61, fat_g: 14, meal_types: ["lunch"], status: "approved",
  }).select("id").single();
  const id = (r as { id: string }).id;
  await db.from("recipe_ingredients").insert([
    { recipe_id: id, position: 1, ingredient_id: id_("arroz-blanco"), quantity: 400, unit: "g", role: "core" },
    { recipe_id: id, position: 2, ingredient_id: id_("pechuga-pollo"), quantity: 2, unit: "unit", role: "core", note: "desmechada" },
    { recipe_id: id, position: 3, ingredient_id: id_("zanahoria"), quantity: 1, unit: "unit", role: "core", note: "en cubitos" },
    { recipe_id: id, position: 4, ingredient_id: id_("cebolla-larga"), quantity: 2, unit: "unit", role: "core" },
    { recipe_id: id, position: 5, ingredient_id: id_("cilantro"), quantity: null, unit: "al gusto", role: "accessory" },
  ]);
  await db.from("recipe_steps").insert([
    { recipe_id: id, position: 1, text: "Cocina las pechugas en agua con sal por 15 minutos.", video_start_seconds: 15 },
    { recipe_id: id, position: 2, text: "Sofríe la cebolla y la zanahoria en una olla a fuego medio.", video_start_seconds: 40 },
    { recipe_id: id, position: 3, text: "Agrega el arroz y el caldo; cocina tapado 20 minutos a 180 °C en el horno.", video_start_seconds: 70 },
  ]);
  await page.goto("/login");
  await signIn(page, `look-${Date.now()}@test.co`);
  await createHousehold(page, "Jorge", "Casa Look");
  await householdSetup(page);
  await personalSetup(page, { dislike: "Cilantro" });
  await page.goto(`/recipes/${id}`);
  await expect(page.getByRole("heading", { name: "Arroz con pollo de la abuela" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "e2e/__screens__/40-recipe-look.png", fullPage: true });
  await page.getByRole("button", { name: "Cocinar", exact: true }).click();
  await expect(page.getByText("Paso 1")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await page.getByRole("button", { name: /Crear temporizador de 20 minutos/ }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "e2e/__screens__/41-cook-look.png" });
  await page.goto(`/plan`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "e2e/__screens__/42-plan-look.png", fullPage: true });
  console.log("RECIPE_ID", id);
});
