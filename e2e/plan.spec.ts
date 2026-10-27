import { expect, test } from "@playwright/test";
import { plannedRecipeIds, seedCatalog } from "./db";
import { createHousehold, hideDevOverlay, householdSetup, personalSetup, signIn } from "./flows";

test("the weekly plan respects allergies and dislikes, and learns from replacements", async ({ page }) => {
  await hideDevOverlay(page);
  const ids = await seedCatalog([
    { title: "Huevos pericos E2E", meal: "breakfast", minutes: 15, ingredients: [{ slug: "huevo" }, { slug: "tomate" }] },
    { title: "Arepa con queso E2E", meal: "breakfast", minutes: 10, ingredients: [{ slug: "arepa", unit: "unit", quantity: 2 }, { slug: "queso-costeno" }] },
    { title: "Sancocho E2E", meal: "lunch", minutes: 120, ingredients: [{ slug: "pollo-entero" }, { slug: "yuca" }, { slug: "cilantro", role: "accessory" }] },
    { title: "Arroz con pollo E2E", meal: "lunch", minutes: 45, ingredients: [{ slug: "arroz-blanco" }, { slug: "pechuga-pollo" }] },
    { title: "Arroz con camarones E2E", meal: "lunch", minutes: 40, ingredients: [{ slug: "arroz-blanco" }, { slug: "camaron" }] },
    { title: "Crema de ahuyama E2E", meal: "dinner", minutes: 30, ingredients: [{ slug: "ahuyama" }, { slug: "cebolla-cabezona" }] },
    { title: "Wrap de pollo E2E", meal: "dinner", minutes: 20, ingredients: [{ slug: "tortilla-trigo", unit: "unit" }, { slug: "pechuga-pollo" }] },
  ]);

  const email = `plan-${Date.now()}@test.co`;
  await page.goto("/login");
  await signIn(page, email);
  await createHousehold(page, "Jorge", "Casa Plan");
  await householdSetup(page);
  await personalSetup(page, { allergy: /Mariscos/, dislike: "Cilantro" });

  // First visit builds the week automatically.
  await expect(page.getByRole("heading", { name: /Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo/ })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "e2e/__screens__/30-plan.png", fullPage: true });

  const planned = await plannedRecipeIds(email);
  expect(planned).toHaveLength(21);
  expect(planned).not.toContain(ids["Arroz con camarones E2E"]);

  const firstDay = page.getByRole("navigation", { name: "Días de la semana" }).getByRole("link").first();
  await firstDay.click();
  // Stops of the day route: breakfast, lunch, dinner.
  const lunchCard = page.getByRole("list", { name: "Comidas del día" }).locator(":scope > li").nth(1);
  // Weekday lunches prefer under an hour, so the 45-minute arroz con pollo wins over the 2-hour sancocho.
  await expect(lunchCard.getByRole("link").first()).toContainText("Arroz con pollo E2E");

  // Replace it "just for today" with the sancocho: the cilantro garnish is removed for Jorge.
  await lunchCard.getByRole("button", { name: /Reemplazar/ }).click();
  await page.getByRole("button", { name: "Solo hoy no" }).click();
  const dialog = page.getByRole("dialog", { name: "Reemplazar comida" });
  const sancocho = dialog.getByRole("button", { name: /Sancocho E2E/ }).first();
  await expect(sancocho).toContainText("sin cilantro");
  await expect(dialog.getByRole("button", { name: /camarones/ })).toHaveCount(0);
  await page.screenshot({ path: "e2e/__screens__/31-replace.png" });
  await sancocho.click();
  await expect(dialog).toBeHidden();
  await expect(lunchCard.getByText("Sin cilantro (Jorge) → perejil")).toBeVisible();

  // Favorite the new lunch and cook it.
  await lunchCard.getByRole("link").first().click();
  await page.getByRole("button", { name: "Me gusta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Quitar me gusta", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cocinar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paso 01 de 02" })).toBeVisible();
  await expect(page.getByRole("button", { name: /10 minutos/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await page.getByRole("button", { name: /10 minutos/ }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/32-cook.png" });
  await page.getByRole("button", { name: "Terminar", exact: true }).click();
  await page.getByRole("button", { name: "Marcar como cocinada" }).click();
  await expect(page.getByRole("button", { name: "Cocinada", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Salir del modo cocina" }).click();
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/plan$/);
  await firstDay.click();
  await expect(lunchCard.getByText("· Comida")).toBeVisible();

  // The cooked lunch counts in calories for that day.
  const monday = (await firstDay.getAttribute("href"))!.split("day=")[1]!;
  await page.goto(`/calories?day=${monday}`);
  await expect(page.getByRole("region", { name: "Total del día" })).toContainText("500");
  await page.screenshot({ path: "e2e/__screens__/60-calories.png", fullPage: true });

  // Other weeks: past ones are a record, future ones are built on demand.
  await page.goto("/plan");
  await page.getByRole("link", { name: "Semana anterior" }).click();
  await expect(page.getByText("Sin plan esa semana")).toBeVisible();
  await page.getByRole("link", { name: "Volver a esta semana" }).click();
  await expect(page.getByRole("navigation", { name: "Semanas" })).toContainText("Esta semana");
  await page.getByRole("link", { name: "Semana siguiente" }).click();
  await expect(page.getByRole("navigation", { name: "Semanas" })).toContainText("Próxima semana");
  await expect(page.getByRole("button", { name: "Armar esta semana" })).toBeVisible();

  await page.goto("/recipes?tab=favorites&who=me");
  await expect(page.getByRole("link", { name: /E2E/ })).toHaveCount(1);
});
