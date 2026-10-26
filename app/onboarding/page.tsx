import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMembership, requireUserIdentity } from "@/lib/auth";
import { OnboardingForms } from "./onboarding-forms";

export const metadata: Metadata = { title: "Cuéntanos acerca de ti" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}

async function OnboardingContent() {
  const [membership, user] = await Promise.all([getMembership(), requireUserIdentity()]);
  if (membership) redirect("/plan");
  return <OnboardingForms userId={user.id} email={user.email} />;
}
