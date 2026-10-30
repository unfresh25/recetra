import { expect, test } from "@playwright/test";
import { mondayOf, todayInBogota, weekDays } from "../../lib/plan/week";
import { seedCatalog, seedStorePrices } from "../db";
import { completePlanWeek, createHousehold, householdSetup, personalSetup, signIn, toggleCheckbox } from "../flows";

// Needs the production build: the service worker only registers there.
test("the shopping list opens without signal", async ({ page, context }) => {
  await seedCatalog([
    { title: "Pericos Offline", meal: "breakfast", minutes: 15, ingredients: [{ slug: "huevo", unit: "unit", quantity: 4 }] },
    { title: "Arroz Offline", meal: "lunch", minutes: 45, ingredients: [{ slug: "arroz-blanco", quantity: 300 }] },
    { title: "Crema Offline", meal: "dinner", minutes: 30, ingredients: [{ slug: "ahuyama", quantity: 500 }] },
  ]);
  await seedStorePrices(["d1", "olimpica"]);

  await page.goto("/login");
  await signIn(page, `offline-${Date.now()}@test.co`);
  await createHousehold(page, "Jorge", "Casa Offline");
  await householdSetup(page);
  await personalSetup(page, {});
  const today = todayInBogota();
  const expectedPlanned = weekDays(mondayOf(today)).filter((day) => day >= today).length * 3;
  await completePlanWeek(page, expectedPlanned);
  await page.getByRole("link", { name: "Lista de compras", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 }).catch(() => page.reload());
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeVisible();

  const label = (await page.getByRole("checkbox").first().getAttribute("aria-label"))!;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Sin conexión");
  await page.getByRole("tab", { name: "Por receta" }).click();
  await expect(page.getByRole("tabpanel").getByText(/ · (Desayuno|Almuerzo|Cena)/).first()).toBeVisible();
  await toggleCheckbox(page.getByRole("checkbox", { name: label, exact: true }).first());
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Comprados (1)" }).click();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Comprados (1)" }).click();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
  await page.screenshot({ path: "e2e/__screens__/52-shopping-offline.png" });
});
