"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { QuestionField } from "@/components/ui/question-field";
import { acceptInvitation } from "@/lib/household/actions";

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation.bind(null, token), undefined);

  return (
    <form action={action} className="flex w-full flex-col items-center gap-10">
      <QuestionField
        label="¿Cómo te llamas?"
        name="displayName"
        autoComplete="given-name"
        placeholder="Tu nombre"
        maxLength={40}
        required
        error={state?.error}
      />
      <Button type="submit" className="min-w-48" loading={pending}>
        Unirme al hogar <Icon name="arrow-right" size={18} />
      </Button>
    </form>
  );
}
