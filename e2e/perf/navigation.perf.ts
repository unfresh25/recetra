import { expect, test } from "@playwright/test";
import { seedCatalog } from "../db";
import { householdSetup, personalSetup, signIn } from "../flows";

// Measures client navigations between tabs (click -> destination content visible).
test("tab navigation timings", async ({ page }) => {
  await seedCatalog([
    { title: "Pericos perf", meal: "breakfast", minutes: 10, ingredients: [{ slug: "huevo" }] },
    { title: "Sancocho perf", meal: "lunch", minutes: 50, ingredients: [{ slug: "yuca" }] },
    { title: "Crema perf", meal: "dinner", minutes: 20, ingredients: [{ slug: "ahuyama" }] },
  ]);
  const email = `perf-${Date.now()}@test.co`;
  await page.goto("/login");
  await signIn(page, email);
  await page.getByLabel("¿Cómo te llamas?").fill("Jorge");
  await page.getByLabel("Nombre del hogar").fill("Casa Perf");
  await page.getByRole("button", { name: "Crear hogar", exact: true }).and(page.locator("[type=submit]")).click();
  await householdSetup(page);
  await personalSetup(page, {});
  await expect(page.getByText("Pericos perf").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500); // let prefetches settle

  const routes: [string, RegExp | string][] = [
    ["Recetas", "Mis recetas"],
    ["Perfil", "Mis preferencias"],
    ["Plan", "Pericos perf"],
    ["Recetas", "Mis recetas"],
    ["Plan", "Pericos perf"],
  ];
  const results: string[] = [];
  for (const [tab, marker] of routes) {
    const t0 = Date.now();
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: tab }).click();
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });
    results.push(`${tab}: ${Date.now() - t0} ms`);
    await page.waitForTimeout(800);
  }
  console.log("NAV TIMINGS\n" + results.join("\n"));
});
