import { expect, type Page } from "@playwright/test";
import { readOtp } from "./mailpit";

const next = (page: Page) => page.getByRole("button", { name: /^(Continuar|Terminar|Como de todo)/ }).click();

/** Kitchen units are the first setup step for everyone; the defaults (metric, °C) are fine. */
export async function preferencesSetup(page: Page) {
  await expect(page).toHaveURL(/\/setup\/preferences$/);
  await next(page);
}

export async function householdSetup(page: Page) {
  await preferencesSetup(page);
  await expect(page).toHaveURL(/\/setup\/stores$/);
  await page.getByRole("checkbox", { name: "D1", exact: true }).click();
  await page.getByRole("checkbox", { name: "Olímpica", exact: true }).click();
  await page.screenshot({ path: "e2e/__screens__/10-setup-stores.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/people$/);
  await next(page);
  await expect(page).toHaveURL(/\/setup\/budget$/);
  await page.screenshot({ path: "e2e/__screens__/11-setup-budget.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/styles$/);
  await page.getByRole("checkbox", { name: /Rápido y fácil/ }).click();
  await page.getByRole("checkbox", { name: /Saludable/ }).click();
  await page.screenshot({ path: "e2e/__screens__/12-setup-styles.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/kitchen$/);
  await page.getByRole("checkbox", { name: /Olla a presión/ }).click();
  await next(page);
}

export async function personalSetup(page: Page, opts: { allergy?: RegExp; dislike?: string }) {
  await expect(page).toHaveURL(/\/setup\/allergies$/);
  if (opts.allergy) await page.getByRole("checkbox", { name: opts.allergy }).click();
  await page.screenshot({ path: "e2e/__screens__/13-setup-allergies.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/dislikes$/);
  if (opts.dislike) await page.getByRole("button", { name: opts.dislike, exact: true }).click();
  await page.screenshot({ path: "e2e/__screens__/14-setup-dislikes.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/diet$/);
  await next(page);
  await expect(page).toHaveURL(/\/plan$/);
}

export async function signIn(page: Page, email: string) {
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Continuar" }).click();
  const code = await readOtp(email);
  // The sixth digit submits on its own.
  await page.getByLabel(/Código enviado a/).fill(code);
}

/** "Cuéntanos acerca de ti" (the nickname defaults to the first name), then the household's name. */
export async function createHousehold(page: Page, name: string, household: string) {
  await page.getByLabel("Tu nombre").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre del hogar").fill(household);
  await page.getByRole("button", { name: "Continuar" }).click();
}
