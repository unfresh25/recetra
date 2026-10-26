import { expect, test } from "@playwright/test";
import { seedBranch, seedCatalog, seedStorePrices } from "./db";
import { createHousehold, hideDevOverlay, householdSetup, personalSetup, signIn } from "./flows";

test("the shopping list prices the week and suggests where to buy", async ({ page, context }) => {
  await hideDevOverlay(page);
  await seedCatalog([
    { title: "Huevos pericos Compras", meal: "breakfast", minutes: 15, ingredients: [{ slug: "huevo", unit: "unit", quantity: 4 }, { slug: "tomate" }] },
    { title: "Arroz con pollo Compras", meal: "lunch", minutes: 45, ingredients: [{ slug: "arroz-blanco", quantity: 300 }, { slug: "pechuga-pollo", quantity: 400 }] },
    { title: "Crema de ahuyama Compras", meal: "dinner", minutes: 30, ingredients: [{ slug: "ahuyama", quantity: 500 }, { slug: "cebolla-cabezona" }] },
  ]);
  await seedStorePrices(["d1", "olimpica"]);
  await seedBranch("olimpica", "Olímpica Paseo Bolívar E2E", 10.98781, -74.78891);
  await seedBranch("d1", "D1 Lejos E2E", 11.0200, -74.8500);

  await page.goto("/login");
  await signIn(page, `shopping-${Date.now()}@test.co`);
  await createHousehold(page, "Jorge", "Casa Compras");
  await householdSetup(page);
  await personalSetup(page, {});
  await expect(page.getByRole("heading", { name: /Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo/ })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: "Lista de compras", exact: true }).click();
  await expect(page.getByRole("radio", { name: /Combinar/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/D1 \+ Olímpica|Olímpica \+ D1/)).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "e2e/__screens__/50-shopping.png", fullPage: true });

  // Each row opens a per-store comparison with the cheapest marked.
  await page.getByRole("button", { name: /Arroz blanco/ }).click();
  await page.screenshot({ path: "e2e/__screens__/51-shopping-row.png" });
  await page.getByRole("button", { name: "Comprar siempre Marca d1" }).click();
  await expect(page.getByRole("button", { name: /Quitar marca fija/ })).toBeVisible();

  await page.getByRole("button", { name: "Por tienda" }).click();
  await expect(page.getByRole("heading", { name: "Olímpica" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Arroz blanco comprado" }).click();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Arroz blanco comprado" })).toBeChecked();

  // Stores tab: the nearest branch first, with directions.
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 10.9878, longitude: -74.7889 });
  await page.getByRole("link", { name: "Tiendas" }).click();
  await page.getByRole("button", { name: /Usar mi ubicación/ }).click();
  const branches = page.getByRole("list", { name: "Sucursales" }).locator(":scope > li");
  await expect(branches.first()).toContainText("Olímpica Paseo Bolívar E2E");
  await expect(branches.first().getByRole("link", { name: "Ruta" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
  await page.screenshot({ path: "e2e/__screens__/53-stores.png" });
});
