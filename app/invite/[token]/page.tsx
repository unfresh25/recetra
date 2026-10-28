import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { Illustration } from "@/components/ui/illustration";
import { QuestionScreen } from "@/components/ui/question-screen";
import { getMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Invitación" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <QuestionScreen compact>
      <Suspense fallback={<PanLoaderScreen />}>
        <Invitation params={params} />
      </Suspense>
    </QuestionScreen>
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
      <div className="flex flex-col items-center gap-6 text-center">
        <Illustration name="invite" size={160} preload />
        <p className="max-w-72 text-[17px] text-ink">{STATUS_COPY[status as keyof typeof STATUS_COPY]}</p>
        <Link href="/onboarding" className="link-text text-center font-semibold text-brand">
          Crear mi propio hogar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <Illustration name="invite" size={144} preload />
        <p className="text-[15px] font-semibold text-ink-muted">{invitation.inviter_name} te invitó a</p>
        <p className="font-condensed text-[40px] font-extrabold leading-none tracking-tight">{invitation.household_name}</p>
      </div>
      <JoinForm token={token} />
    </div>
  );
}
