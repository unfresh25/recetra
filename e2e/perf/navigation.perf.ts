import { expect, test } from "@playwright/test";
import { seedCatalog } from "../db";
import { createHousehold, householdSetup, personalSetup, signIn } from "../flows";

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
  await createHousehold(page, "Jorge", "Casa Perf");
  await householdSetup(page);
  await personalSetup(page, {});
  await expect(page.getByText("Pericos perf").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500); // let prefetches settle

  const routes: [string, RegExp | string][] = [
    ["Guardados", "Mis recetas"],
    ["Perfil", "Mis preferencias"],
    ["Plan", "Pericos perf"],
    ["Guardados", "Mis recetas"],
    ["Plan", "Pericos perf"],
  ];
  const results: string[] = [];
  for (const [tab, marker] of routes) {
    const t0 = Date.now();
    if (tab === "Guardados") {
      await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Perfil" }).click();
      await page.getByRole("link", { name: "Guardados Tus recetas y favoritos" }).click();
    } else {
      await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: tab }).click();
    }
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 15_000 });
    results.push(`${tab}: ${Date.now() - t0} ms`);
    await page.waitForTimeout(800);
  }
  console.log("NAV TIMINGS\n" + results.join("\n"));
});
