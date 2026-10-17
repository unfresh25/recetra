import { expect, test } from "@playwright/test";
import { adminDb } from "../db";
import { householdSetup, personalSetup, signIn } from "../flows";

test("cook mode keeps one YouTube player and seeks per step", async ({ page }) => {
  const { rest: db } = adminDb();
  const { data: egg } = await db.from("ingredients").select("id").eq("slug", "huevo").single();
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
  await page.getByLabel("¿Cómo te llamas?").fill("Jorge");
  await page.getByLabel("Nombre del hogar").fill("Casa Video");
  await page.getByRole("button", { name: "Crear hogar", exact: true }).and(page.locator("[type=submit]")).click();
  await householdSetup(page);
  await personalSetup(page, {});

  await page.goto(`/recipes/${id}`);
  await page.getByRole("link", { name: "Cocinar ahora" }).click();
  const iframe = page.locator("iframe");
  await expect(iframe).toHaveCount(1, { timeout: 20_000 });
  const firstHandle = await iframe.elementHandle();
  const src1 = await iframe.getAttribute("src");
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await page.waitForTimeout(2500);
  const same = await page.evaluate((el) => el?.isConnected, firstHandle);
  const time = await page.evaluate(() => (document.querySelector("iframe") as HTMLIFrameElement | null) && (window as unknown as { __t?: number }).__t);
  console.log("SRC1", src1?.slice(0, 80), "| same iframe after step:", same, "| count:", await iframe.count(), time ?? "");
  expect(same).toBe(true);
});
