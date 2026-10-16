"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { createHousehold } from "@/lib/household/actions";
import { parseInviteToken } from "@/lib/household/invite-token";
import { cn } from "@/lib/utils/cn";

type Mode = "create" | "join";

export function OnboardingForms() {
  const [mode, setMode] = useState<Mode>("create");

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-sunken p-1">
        {(
          [
            ["create", "Crear hogar"],
            ["join", "Me invitaron"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "h-11 rounded-full text-[15px] font-semibold transition-colors",
              mode === value ? "bg-surface text-brand shadow-card" : "text-ink-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "create" ? <CreateHouseholdForm /> : <JoinForm />}
    </div>
  );
}

function CreateHouseholdForm() {
  const [state, action, pending] = useActionState(createHousehold, undefined);

  return (
    <form action={action} className="flex flex-1 flex-col gap-5">
      <TextField label="¿Cómo te llamas?" name="displayName" autoComplete="given-name" placeholder="Jorge" required />
      <TextField
        label="Nombre del hogar"
        name="householdName"
        placeholder="Casa Borja"
        hint="Después podrás invitar a tu pareja."
        required
        error={state?.error}
      />
      <div className="mt-auto pb-safe">
        <Button type="submit" block loading={pending}>
          Crear hogar
        </Button>
      </div>
    </form>
  );
}

function JoinForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = parseInviteToken(String(new FormData(event.currentTarget).get("invite") ?? ""));
    if (!token) {
      setError("Pega el link completo que te enviaron.");
      return;
    }
    router.push(`/invite/${token}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5">
      <Card className="flex gap-3 bg-teal-soft/60 shadow-none">
        <span aria-hidden className="text-2xl">💌</span>
        <p className="text-[15px] text-ink">
          Si te llegó un link de invitación, ábrelo directamente o pégalo aquí.
        </p>
      </Card>
      <TextField label="Link de invitación" name="invite" placeholder="https://…/invite/…" error={error} required />
      <div className="mt-auto pb-safe">
        <Button type="submit" block>
          Continuar
        </Button>
      </div>
    </form>
  );
}
