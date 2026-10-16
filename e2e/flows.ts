import { expect, type Page } from "@playwright/test";
import { readOtp } from "./mailpit";

const next = (page: Page) => page.getByRole("button", { name: /^(Continuar|Terminar|Como de todo)/ }).click();

export async function householdSetup(page: Page) {
  await expect(page).toHaveURL(/\/setup\/stores$/);
  await page.getByRole("button", { name: "D1", exact: true }).click();
  await page.getByRole("button", { name: "Olímpica", exact: true }).click();
  await page.screenshot({ path: "e2e/__screens__/10-setup-stores.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/people$/);
  await next(page);
  await expect(page).toHaveURL(/\/setup\/budget$/);
  await page.screenshot({ path: "e2e/__screens__/11-setup-budget.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/styles$/);
  await page.getByRole("button", { name: /Rápido y fácil/ }).click();
  await page.getByRole("button", { name: /Saludable/ }).click();
  await page.screenshot({ path: "e2e/__screens__/12-setup-styles.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/kitchen$/);
  await page.getByRole("button", { name: /Olla a presión/ }).click();
  await next(page);
}

export async function personalSetup(page: Page, opts: { allergy?: RegExp; dislike?: string }) {
  await expect(page).toHaveURL(/\/setup\/allergies$/);
  await page.getByRole("button", { name: opts.allergy ?? /Ninguna/ }).click();
  await page.screenshot({ path: "e2e/__screens__/13-setup-allergies.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/dislikes$/);
  if (opts.dislike) await page.getByRole("button", { name: opts.dislike, exact: true }).click();
  await page.screenshot({ path: "e2e/__screens__/14-setup-dislikes.png" });
  await next(page);
  await expect(page).toHaveURL(/\/setup\/diet$/);
  await page.getByRole("button", { name: /Ninguna/ }).click();
  await next(page);
  await expect(page).toHaveURL(/\/setup\/done$/);
  await page.getByRole("button", { name: "Ir a mi plan" }).click();
  await expect(page).toHaveURL(/\/plan$/);
}

export async function signIn(page: Page, email: string) {
  await page.getByLabel("Correo").fill(email);
  await page.getByRole("button", { name: "Enviar código" }).click();
  const code = await readOtp(email);
  await page.getByLabel(/Código enviado a/).fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
}
