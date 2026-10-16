import { expect, test } from "@playwright/test";
import { householdSetup, personalSetup, signIn } from "./flows";

const run = Date.now();
const owner = { email: `owner-${run}@test.co`, name: "Jorge" };
const partner = { email: `partner-${run}@test.co`, name: "Ana" };

test("a couple creates a household and joins it through an invitation", async ({ browser }) => {
  const ownerPage = await (await browser.newContext()).newPage();

  await ownerPage.goto("/");
  await expect(ownerPage).toHaveURL(/\/welcome$/);
  await ownerPage.screenshot({ path: "e2e/__screens__/01-welcome.png" });
  // Desktop-friendly carousel: the main button advances, the last slide starts.
  await ownerPage.getByRole("button", { name: "Siguiente" }).click();
  await expect(ownerPage.getByRole("heading", { name: "Compra donde más rinde" })).toBeInViewport();
  await ownerPage.getByRole("button", { name: "Siguiente" }).click();
  await expect(ownerPage.getByRole("heading", { name: "Aprende de sus gustos" })).toBeInViewport();
  await ownerPage.getByRole("button", { name: "Empezar" }).click();
  await expect(ownerPage).toHaveURL(/\/login$/);
  await ownerPage.screenshot({ path: "e2e/__screens__/02-login.png" });

  await signIn(ownerPage, owner.email);
  await expect(ownerPage).toHaveURL(/\/onboarding$/);
  await ownerPage.screenshot({ path: "e2e/__screens__/03-onboarding.png" });

  await ownerPage.getByLabel("¿Cómo te llamas?").fill(owner.name);
  await ownerPage.getByLabel("Nombre del hogar").fill("Casa Borja");
  await ownerPage.getByRole("button", { name: "Crear hogar", exact: true }).and(ownerPage.locator("[type=submit]")).click();
  await householdSetup(ownerPage);
  await personalSetup(ownerPage, { dislike: "Cilantro" });
  await expect(ownerPage).toHaveURL(/\/plan$/);
  await expect(ownerPage.getByText("Casa Borja").first()).toBeVisible({ timeout: 20_000 });
  await ownerPage.screenshot({ path: "e2e/__screens__/04-plan.png" });

  await ownerPage.getByRole("link", { name: "Perfil" }).click();
  await ownerPage.getByRole("button", { name: "Invitar a mi pareja" }).click();
  const inviteLink = ownerPage.getByText(/\/invite\//);
  await expect(inviteLink).toBeVisible();
  const inviteUrl = new URL((await inviteLink.textContent())!.trim());
  await ownerPage.screenshot({ path: "e2e/__screens__/05-profile-invite.png" });

  const partnerPage = await (await browser.newContext()).newPage();
  await partnerPage.goto(inviteUrl.pathname);
  await expect(partnerPage).toHaveURL(/\/login\?next=/);
  await signIn(partnerPage, partner.email);

  await expect(partnerPage.getByText(`${owner.name} te invitó a`)).toBeVisible();
  await partnerPage.screenshot({ path: "e2e/__screens__/06-invite.png" });
  await partnerPage.getByLabel("¿Cómo te llamas?").fill(partner.name);
  await partnerPage.getByRole("button", { name: "Unirme al hogar" }).click();
  // The household is already configured, so the partner only answers personal questions.
  await personalSetup(partnerPage, { allergy: /Mariscos/ });
  await expect(partnerPage).toHaveURL(/\/plan$/);
  await expect(partnerPage.getByText("Casa Borja").first()).toBeVisible({ timeout: 20_000 });

  // The invitation is single-use.
  const intruder = await (await browser.newContext()).newPage();
  await intruder.goto(inviteUrl.pathname);
  await signIn(intruder, `intruder-${run}@test.co`);
  await expect(intruder.getByText("Esta invitación ya fue usada")).toBeVisible();

  await ownerPage.reload();
  await expect(ownerPage.getByText(partner.name, { exact: true })).toBeVisible();
  await expect(ownerPage.getByRole("button", { name: "Invitar a mi pareja" })).toHaveCount(0);
  await ownerPage.screenshot({ path: "e2e/__screens__/07-profile-couple.png" });

  await ownerPage.getByRole("link", { name: /Mis preferencias/ }).click();
  await expect(ownerPage.getByText("Olímpica, D1")).toBeVisible();
  await expect(ownerPage.getByText("Cilantro")).toBeVisible();
  await ownerPage.screenshot({ path: "e2e/__screens__/15-preferences.png" });
});
