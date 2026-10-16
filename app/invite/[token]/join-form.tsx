"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { acceptInvitation } from "@/lib/household/actions";

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation.bind(null, token), undefined);

  return (
    <form action={action} className="flex flex-1 flex-col gap-5">
      <TextField
        label="¿Cómo te llamas?"
        name="displayName"
        autoComplete="given-name"
        placeholder="Tu nombre"
        required
        error={state?.error}
      />
      <div className="mt-auto pb-safe">
        <Button type="submit" block loading={pending}>
          Unirme al hogar
        </Button>
      </div>
    </form>
  );
}
