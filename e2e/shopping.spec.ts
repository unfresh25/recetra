import { expect, test } from "@playwright/test";
import { mondayOf, todayInBogota, weekDays } from "../lib/plan/week";
import { seedBranch, seedCatalog, seedStorePrices } from "./db";
import { completePlanWeek, createHousehold, hideDevOverlay, householdSetup, personalSetup, signIn, toggleCheckbox } from "./flows";

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
  const today = todayInBogota();
  const expectedPlanned = weekDays(mondayOf(today)).filter((day) => day >= today).length * 3;
  await completePlanWeek(page, expectedPlanned);

  await page.getByRole("link", { name: "Lista de compras", exact: true }).click();
  await expect(page.getByRole("region", { name: "Resumen" })).toBeVisible();
  const options = page.getByRole("radiogroup", { name: "Dónde comprar" });
  await expect(options.getByRole("radio", { checked: true })).toHaveCount(1);
  // The local catalog has hundreds of recipes. Exercise the selected plan rather than a particular recipe.
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "e2e/__screens__/50-shopping.png", fullPage: true });

  // A real catalog may have unpriced ingredients or products without a brand. Find a pinnable one.
  const checkboxes = page.getByRole("checkbox");
  const drawer = page.getByRole("dialog");
  const pin = drawer.getByRole("button", { name: /^Comprar siempre/ });
  let label = "";
  for (let index = 0; index < await checkboxes.count(); index++) {
    const checkbox = checkboxes.nth(index);
    label = (await checkbox.getAttribute("aria-label"))!;
    const ingredientName = label.replace(/ comprado$/, "");
    await checkbox.locator("xpath=ancestor::li[1]").getByRole("button").click();
    await expect(drawer.getByRole("heading", { name: ingredientName, exact: true })).toBeVisible();
    await expect(drawer.getByText(/^(Necesitas|Para) /)).toBeVisible();
    if (await pin.count()) break;
    await drawer.getByRole("button", { name: "Cerrar", exact: true }).click();
  }
  await expect(pin).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/51-shopping-row.png" });
  await pin.click();
  await expect(drawer.getByRole("button", { name: /Quitar marca fija/ })).toBeVisible();
  await drawer.getByRole("button", { name: /Quitar marca fija/ }).click();
  await expect(pin).toBeVisible();
  await drawer.getByRole("button", { name: "Cerrar", exact: true }).click();

  const initial = options.getByRole("radio").first();
  await expect(initial).toHaveAttribute("aria-checked", "true");
  const singleStore = options.getByRole("radio").last();
  await singleStore.click();
  await expect(singleStore).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("region", { name: "Resumen" })).toContainText("Todo en");
  await initial.click();
  await expect(initial).toHaveAttribute("aria-checked", "true");

  await page.getByRole("tab", { name: "Por tienda" }).click();
  await expect(page.getByRole("tab", { name: "Por tienda" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("heading").first()).toBeVisible();
  await page.getByRole("tab", { name: "Por receta" }).click();
  await expect(page.getByRole("tab", { name: "Por receta" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByText(/ · (Desayuno|Almuerzo|Cena)/).first()).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("button", { name: /Sin precio|\$/ })).toHaveCount(0);

  // The same ingredient may appear under several meals. Buying it removes every occurrence.
  await toggleCheckbox(page.getByRole("checkbox", { name: label, exact: true }).first());
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: "Comprados (1)" }).click();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
  await toggleCheckbox(page.getByRole("checkbox", { name: label, exact: true }));
  await expect(page.getByRole("checkbox", { name: label, exact: true }).first()).not.toBeChecked();
  await page.getByRole("tab", { name: "Por pasillo" }).click();
  await toggleCheckbox(page.getByRole("checkbox", { name: label, exact: true }));
  await page.reload();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Comprados (1)" }).click();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Opciones de compras", exact: true }).click();
  await page.getByRole("button", { name: "Desmarcar todo", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: label, exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Opciones de compras", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desmarcar todo", exact: true })).toBeDisabled();
  await page.getByRole("dialog").getByRole("button", { name: "Cerrar", exact: true }).click();

  await page.goto("/shopping/review");
  await expect(page.getByRole("heading", { name: "Revisar productos", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Secciones de compras" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Volver", exact: true })).toHaveAttribute("href", "/shopping");
  await page.getByRole("link", { name: "Volver", exact: true }).click();

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
