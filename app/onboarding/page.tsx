import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getMembership } from "@/lib/auth";
import { OnboardingForms } from "./onboarding-forms";

export const metadata: Metadata = { title: "Tu hogar" };

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 flex-col gap-8">
      <ScreenHeader title="Armemos tu hogar" subtitle="Recetra planea para todos los que comen en casa." />
      <div className="flex flex-1 flex-col px-5">
        <Suspense>
          <RedirectIfMember />
          <OnboardingForms />
        </Suspense>
      </div>
    </main>
  );
}

async function RedirectIfMember() {
  if (await getMembership()) redirect("/plan");
  return null;
}
