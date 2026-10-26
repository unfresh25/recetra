import { expect, test } from "@playwright/test";
import { seedCatalog, seedStorePrices } from "../db";
import { createHousehold, householdSetup, personalSetup, signIn } from "../flows";

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
  await expect(page.getByRole("heading", { name: /Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Lista de compras", exact: true }).click();
  await expect(page.getByRole("button", { name: /Arroz blanco/ })).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 }).catch(() => page.reload());
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await expect(page.getByRole("button", { name: /Arroz blanco/ })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /Arroz blanco/ })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Sin conexión");
  await page.getByRole("checkbox", { name: "Arroz blanco comprado" }).click();
  await expect(page.getByRole("checkbox", { name: "Arroz blanco comprado" })).toBeChecked();
  await page.screenshot({ path: "e2e/__screens__/52-shopping-offline.png" });
});
