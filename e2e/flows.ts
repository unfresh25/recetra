import { expect, type Page } from "@playwright/test";
import { readOtp } from "./mailpit";

export async function hideDevOverlay(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal{display:none!important}";
      document.head.appendChild(style);
    });
  });
}

const next = (page: Page, name = "Continuar") => page.getByRole("button", { name, exact: true }).click();

async function selectOption(page: Page, name: string | RegExp) {
  const checkbox = page.getByRole("checkbox", { name, exact: true });
  // HeroUI hides the input; its wrapping label is the visible pointer target.
  await page.locator("label").filter({ has: checkbox }).click();
  await expect(checkbox).toBeChecked();
}

/** Kitchen units are the first setup step for everyone; the defaults (metric, °C) are fine. */
export async function preferencesSetup(page: Page) {
  await expect(page).toHaveURL(/\/setup\/preferences$/);
  await next(page);
}

export async function householdSetup(page: Page) {
  await preferencesSetup(page);
  await expect(page).toHaveURL(/\/setup\/stores$/);
  await selectOption(page, "D1");
  await selectOption(page, "Olímpica");
  await page.screenshot({ path: "e2e/__screens__/10-setup-stores.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/people$/);
  await next(page);
  await expect(page).toHaveURL(/\/setup\/budget$/);
  await page.screenshot({ path: "e2e/__screens__/11-setup-budget.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/styles$/);
  await selectOption(page, "Rápido y fácil");
  await selectOption(page, "Saludable");
  await page.screenshot({ path: "e2e/__screens__/12-setup-styles.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/kitchen$/);
  await selectOption(page, "Olla a presión");
  await next(page);
}

export async function personalSetup(page: Page, opts: { allergy?: RegExp; dislike?: string }) {
  await expect(page).toHaveURL(/\/setup\/allergies$/);
  if (opts.allergy) await selectOption(page, opts.allergy);
  await page.screenshot({ path: "e2e/__screens__/13-setup-allergies.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/dislikes$/);
  if (opts.dislike) await page.getByRole("button", { name: opts.dislike, exact: true }).click();
  await page.screenshot({ path: "e2e/__screens__/14-setup-dislikes.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/diet$/);
  await next(page, "Terminar");
  await expect(page).toHaveURL(/\/plan$/);
}

/** A first visit leaves the week empty; generation is always an explicit action. */
export async function completePlanWeek(page: Page, expectedPlanned: number, emptyWeek = true) {
  await page.getByRole("button", { name: emptyWeek ? "Completar semana automáticamente" : "Completar semana", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Completando semana" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Completando semana" })).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText(`${expectedPlanned} de 21 comidas`, { exact: true })).toBeVisible();
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
