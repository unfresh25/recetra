import { expect, test } from "@playwright/test";
import { seedDraftRecipe } from "./db";
import { householdSetup, personalSetup, signIn } from "./flows";

test("an imported recipe is reviewed in the inbox and then shows in Mis recetas", async ({ page }) => {
  const email = `recipes-${Date.now()}@test.co`;
  await page.goto("/login");
  await signIn(page, email);
  await page.getByLabel("¿Cómo te llamas?").fill("Jorge");
  await page.getByLabel("Nombre del hogar").fill("Casa Recetas");
  await page.getByRole("button", { name: "Crear hogar", exact: true }).and(page.locator("[type=submit]")).click();
  await householdSetup(page);
  await personalSetup(page, {});

  await seedDraftRecipe(email);
  await page.reload();

  await expect(page.getByRole("link", { name: /1 pendientes por confirmar/ })).toBeVisible();
  await page.getByRole("link", { name: /pendientes por confirmar/ }).click();
  await expect(page.getByText("Arroz con todo de chorizo y huevo")).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/20-inbox.png" });

  // Recipy put this as breakfast; it's a lunch.
  await page.getByRole("button", { name: "Desayuno" }).click();
  await page.getByRole("button", { name: "Almuerzo" }).click();
  await page.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Todo al día")).toBeVisible();

  await page.goto("/recipes");
  await expect(page.getByRole("link", { name: /Arroz con todo de chorizo y huevo/ })).toContainText("Almuerzo");
  await page.getByRole("link", { name: /Arroz con todo de chorizo y huevo/ }).click();
  await expect(page.getByRole("heading", { name: "Arroz con todo de chorizo y huevo" })).toBeVisible();
  await expect(page.getByText("del día anterior")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adorno" })).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/21-recipe-detail.png", fullPage: true });
});
