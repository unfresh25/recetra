import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMembership } from "@/lib/auth";
import { OnboardingForms } from "./onboarding-forms";

export const metadata: Metadata = { title: "Tu hogar" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <RedirectIfMember />
      <OnboardingForms />
    </Suspense>
  );
}

async function RedirectIfMember() {
  if (await getMembership()) redirect("/plan");
  return null;
}
