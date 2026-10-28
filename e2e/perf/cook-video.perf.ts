import { expect, test } from "@playwright/test";
import { adminDb } from "../db";
import { createHousehold, householdSetup, personalSetup, signIn } from "../flows";

test("cook mode keeps one player across PiP, video view and hiding", async ({ page }) => {
  const { rest: db } = adminDb();
  const { data: egg } = await db.from("ingredients").select("id").eq("slug", "huevo").single();
  await db.from("recipes").delete().eq("source_video_id", "y_TyEhcejbE");
  const { data: recipe } = await db
    .from("recipes")
    .insert({ title: "Pericos video", source_platform: "youtube", source_video_id: "y_TyEhcejbE", author_name: "Recetra E2E", meal_types: ["breakfast"], status: "approved", total_minutes: 10 })
    .select("id")
    .single();
  const id = (recipe as { id: string }).id;
  await db.from("recipe_ingredients").insert({ recipe_id: id, position: 1, ingredient_id: (egg as { id: string }).id, quantity: 3, unit: "unit" });
  await db.from("recipe_steps").insert([
    { recipe_id: id, position: 1, text: "Pique la cebolla.", video_start_seconds: 36 },
    { recipe_id: id, position: 2, text: "Agregue el tomate.", video_start_seconds: 69 },
  ]);

  await page.goto("/login");
  await signIn(page, `video-${Date.now()}@test.co`);
  await createHousehold(page, "Jorge", "Casa Video");
  await householdSetup(page);
  await personalSetup(page, {});

  await page.goto(`/recipes/${id}`);
  await page.getByRole("button", { name: "Cocinar", exact: true }).click();
  const iframe = page.getByRole("main", { name: "Modo cocina" }).locator("iframe");
  await expect(iframe).toHaveCount(1, { timeout: 20_000 });
  await expect(iframe).toHaveAttribute("src", /start=36/);
  await iframe.evaluate((element) => { element.dataset.sessionPlayer = "same"; });
  await page.getByRole("button", { name: "Abrir modo video", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Modo video" })).toBeVisible();
  await expect(iframe).toHaveAttribute("data-session-player", "same");
  await page.getByRole("button", { name: "Volver a los pasos", exact: true }).click();
  await page.getByRole("button", { name: "Ocultar video", exact: true }).click();
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toBeHidden();
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paso 02 de 02" })).toBeVisible();
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("data-session-player", "same");
  // Timestamp changes use seekTo; the iframe URL and DOM node stay stable.
  await expect(iframe).toHaveAttribute("src", /start=36/);
});
