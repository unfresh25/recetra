import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { requireMembership } from "@/lib/auth";
import { finishSetup } from "@/lib/onboarding/actions";

export const metadata: Metadata = { title: "¡Listo!" };

export default function SetupDonePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 pt-safe text-center">
      <Illustration name="welcome-taste" size={220} preload />
      <Suspense fallback={<h1 className="font-display text-3xl font-extrabold">¡Listo!</h1>}>
        <Done />
      </Suspense>
    </main>
  );
}

async function Done() {
  const { member, setupFlow } = await requireMembership();
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">¡Listo, {member.display_name}!</h1>
      <p className="text-[16px] text-ink-muted">
        {setupFlow.length > 3
          ? "Ya conocemos su hogar. Con esto armaremos el plan de cada semana."
          : "Guardamos tus gustos. Desde ahora el plan del hogar los tendrá en cuenta."}
      </p>
      <form action={finishSetup} className="w-full pb-safe">
        <Button type="submit" block>
          Ir a mi plan
        </Button>
      </form>
    </>
  );
}
