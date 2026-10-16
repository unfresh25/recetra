import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { signOut } from "@/lib/household/actions";
import { createClient } from "@/lib/supabase/server";
import { InviteButton } from "./invite-button";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <>
      <ScreenHeader title="Perfil" />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <Suspense fallback={<Card className="h-48 animate-pulse" />}>
          <HouseholdCard />
        </Suspense>
        <Link href="/profile/preferences" className="flex items-center gap-4 rounded-card bg-surface p-5 shadow-card">
          <span aria-hidden className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-xl">⚙️</span>
          <span className="flex-1">
            <span className="block font-display font-bold">Mis preferencias</span>
            <span className="block text-sm text-ink-muted">Tiendas, presupuesto, alergias y lo que no comes</span>
          </span>
          <Icon name="arrow-right" size={18} className="text-ink-faint" />
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="md" block>
            <Icon name="logout" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </>
  );
}

async function HouseholdCard() {
  const { member, household } = await requireReadyMembership();
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("members")
    .select("id, display_name, accent_color, role")
    .order("created_at");

  const housemates = members ?? [];

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Tu hogar</p>
        <p className="font-display text-2xl font-extrabold">{household.name}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {housemates.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar name={m.display_name} accent={m.accent_color} />
            <span className="flex-1 font-semibold">
              {m.display_name}
              {m.id === member.id ? <span className="font-normal text-ink-muted"> (tú)</span> : null}
            </span>
            {m.role === "owner" ? <span className="text-xs text-ink-muted">Creó el hogar</span> : null}
          </li>
        ))}
      </ul>
      {housemates.length < 2 ? <InviteButton householdName={household.name} /> : null}
    </Card>
  );
}
