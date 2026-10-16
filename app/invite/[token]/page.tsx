import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Illustration } from "@/components/ui/illustration";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Invitación" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex flex-1 flex-col gap-8">
      <ScreenHeader title="Te invitaron" />
      <div className="flex flex-1 flex-col px-5">
        <Suspense fallback={<Card className="h-24 animate-pulse" />}>
          <Invitation params={params} />
        </Suspense>
      </div>
    </main>
  );
}

const STATUS_COPY = {
  used: "Esta invitación ya fue usada. Pide una nueva a quien te invitó.",
  expired: "Esta invitación venció. Pide una nueva a quien te invitó.",
  missing: "No encontramos esta invitación. Revisa que el link esté completo.",
} as const;

async function Invitation({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  if (await getMembership()) redirect("/plan");

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invitation = data?.[0];
  const status = invitation?.status ?? "missing";

  if (status !== "valid" || !invitation) {
    return (
      <div className="flex flex-col gap-5">
        <Card>
          <p className="text-[15px]">{STATUS_COPY[status as keyof typeof STATUS_COPY]}</p>
        </Card>
        <Link href="/onboarding" className="text-center font-semibold text-brand">
          Crear mi propio hogar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Illustration name="invite" size={176} preload className="self-center" />
      <Card className="flex flex-col gap-1">
        <p className="text-[15px] text-ink-muted">{invitation.inviter_name} te invitó a</p>
        <p className="font-display text-2xl font-extrabold">{invitation.household_name}</p>
      </Card>
      <JoinForm token={token} />
    </div>
  );
}
