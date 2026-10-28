import { expect, test } from "@playwright/test";
import { addDays, dayLabel, dayOfMonth, mondayOf, todayInBogota, weekDays } from "../lib/plan/week";
import { plannedRecipeIds, seedCatalog } from "./db";
import { completePlanWeek, createHousehold, hideDevOverlay, householdSetup, personalSetup, signIn } from "./flows";

test("weeks start empty; completion, manual placement, removal and replacements preserve user choices", async ({ page }) => {
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

  const today = todayInBogota();
  const monday = mondayOf(today);
  const pastDays = weekDays(monday).filter((day) => day < today);
  const expectedCurrentMeals = (7 - pastDays.length) * 3;
  await expect(page.getByRole("heading", { name: "Tu semana está en blanco" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Opciones de/ })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Semanas" }).getByRole("link")).toHaveCount(2);
  await completePlanWeek(page, expectedCurrentMeals);
  await expect(page.getByRole("button", { name: "Completar semana", exact: true })).toHaveCount(0);
  for (const day of pastDays) await expect(page.locator(`#plan-${day}`)).toHaveCount(0);
  await page.screenshot({ path: "e2e/__screens__/30-plan.png", fullPage: true });
  const planned = await plannedRecipeIds(email);
  expect(planned).toHaveLength(21);
  expect(planned.filter(Boolean)).toHaveLength(expectedCurrentMeals);
  expect(planned).not.toContain(ids["Arroz con camarones E2E"]);

  // Replacement depends on eligibility, not on the order of the public catalog.
  const lunch = page.locator(`#plan-${today}`).getByRole("list").locator(":scope > li").nth(1);
  const originalTitle = (await lunch.getByRole("button", { name: /Opciones de/ }).getAttribute("aria-label"))!.replace(/^Opciones de /, "");
  await lunch.getByRole("button", { name: /Opciones de/ }).click();
  await page.getByRole("button", { name: "Reemplazar", exact: true }).click();
  const replacement = page.getByRole("dialog", { name: "Reemplazar comida" });
  await replacement.getByRole("button", { name: "Solo hoy no" }).click();
  const options = replacement.locator("ul > li > button");
  await expect(options.first()).toBeVisible();
  const titles = await options.locator("span.block.font-semibold").allTextContents();
  const optionText = await options.allTextContents();
  const adjustedIndex = titles.findIndex((title, index) => title !== originalTitle && / · sin /i.test(optionText[index]!));
  const choiceIndex = adjustedIndex >= 0 ? adjustedIndex : titles.findIndex((title) => title !== originalTitle);
  expect(choiceIndex).toBeGreaterThanOrEqual(0);
  const choice = options.nth(choiceIndex);
  const replacementTitle = await choice.locator("span.block.font-semibold").innerText();
  expect(replacementTitle).not.toBe(originalTitle);
  const hasAdjustments = / · sin /i.test(await choice.innerText());
  await page.screenshot({ path: "e2e/__screens__/31-replace.png" });
  await choice.click();
  await expect(replacement).toBeHidden();
  await expect(lunch.getByRole("button", { name: `Opciones de ${replacementTitle}` })).toBeVisible();
  if (hasAdjustments) await expect(lunch.getByText(/^Sin /)).toBeVisible();

  // Remove an actionable slot and come back through Buscar with its context intact.
  const dinner = page.locator(`#plan-${today}`).getByRole("list").locator(":scope > li").nth(2);
  await dinner.getByRole("button", { name: /Opciones de/ }).click();
  await page.getByRole("button", { name: "Quitar del plan" }).click();
  const addDinner = dinner.getByRole("link", { name: /^Agregar cena el/ });
  await expect(addDinner).toBeVisible();
  await addDinner.click();
  await expect(page).toHaveURL(new RegExp(`/search\\?plan=${today}\\.dinner`));
  await expect(page.getByText(`Agregando cena · ${dayLabel(today, "long").toLowerCase()} ${dayOfMonth(today)}`)).toBeVisible();
  await page.getByRole("searchbox", { name: "Nombre de receta" }).fill("Wrap de pollo E2E");
  await page.getByRole("button", { name: "Buscar recetas" }).click();
  await page.getByRole("list", { name: "Resultados de búsqueda" }).getByRole("link", { name: /Wrap de pollo E2E/ }).click();
  const placement = page.getByRole("dialog", { name: "Agregar al plan" });
  await expect(placement).toBeVisible();
  await expect(placement.getByRole("button", { name: "Cena", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(placement.getByText("En el plan: libre")).toBeVisible();
  await placement.getByRole("button", { name: "Agregar al plan", exact: true }).click();
  await expect(page).toHaveURL(`/plan?week=${monday}`);
  await expect(dinner.getByRole("link")).toContainText("Wrap de pollo E2E");

  // A cooked meal remains in place, and removing it is disabled.
  await lunch.getByRole("button", { name: /Opciones de/ }).click();
  await page.getByRole("button", { name: "Ya la comí", exact: true }).click();
  await expect(lunch.getByText("Comida", { exact: true })).toBeVisible();
  await lunch.getByRole("button", { name: /Opciones de/ }).click();
  await expect(page.getByRole("button", { name: "Quitar del plan" })).toBeDisabled();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  // An uncreated next week also accepts a first manual placement, then fills the other 20.
  const nextMonday = addDays(monday, 7);
  await page.getByRole("navigation", { name: "Semanas" }).getByRole("link", { name: /Próxima/ }).click();
  await expect(page.getByRole("heading", { name: "Tu semana está en blanco" })).toBeVisible();
  await page.locator(`#plan-${nextMonday}`).getByRole("link", { name: /^Agregar almuerzo el/ }).click();
  await page.getByRole("searchbox", { name: "Nombre de receta" }).fill("Sancocho E2E");
  await page.getByRole("button", { name: "Buscar recetas" }).click();
  await page.getByRole("list", { name: "Resultados de búsqueda" }).getByRole("link", { name: /Sancocho E2E/ }).click();
  await page.getByRole("dialog", { name: "Agregar al plan" }).getByRole("button", { name: "Agregar al plan", exact: true }).click();
  await expect(page).toHaveURL(`/plan?week=${nextMonday}`);
  await expect(page.getByText("1 de 21 comidas", { exact: true })).toBeVisible();
  const chosen = page.locator(`#plan-${nextMonday}`).getByRole("list").locator(":scope > li").nth(1);
  const chosenHref = await chosen.getByRole("link").getAttribute("href");
  await completePlanWeek(page, 21, false);
  await expect(chosen.getByRole("link")).toHaveAttribute("href", chosenHref!);
  await expect(chosen.getByRole("link")).toContainText("Sancocho E2E");

  // Old day links still resolve to the correct week.
  await page.goto(`/plan?day=${today}`);
  await expect(page.getByRole("navigation", { name: "Semanas" }).locator('a[aria-current="page"]')).toHaveAttribute("href", `/plan?week=${monday}`);
  await expect(lunch.getByText("Comida", { exact: true })).toBeVisible();
});
