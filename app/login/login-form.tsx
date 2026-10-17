"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { QuestionField } from "@/components/ui/question-field";
import { QuestionScreen } from "@/components/ui/question-screen";
import { createClient } from "@/lib/supabase/client";

type Step = { kind: "email" } | { kind: "code"; email: string };

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/plan";
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    setPending(true);
    setError(undefined);
    const { error } = await createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Espera un momento antes de pedir otro código." : "No pudimos enviar el código. Revisa el correo.");
      return;
    }
    setStep({ kind: "code", email });
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.kind !== "code") return;
    const token = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");
    setPending(true);
    setError(undefined);
    const { error } = await createClient().auth.verifyOtp({ email: step.email, token, type: "email" });
    if (error) {
      setPending(false);
      setError("Código incorrecto o vencido.");
      return;
    }
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  }

  if (step.kind === "email") {
    return (
      <QuestionScreen back="/welcome">
        <form key="email" onSubmit={sendCode} className="flex w-full flex-col items-center gap-10">
          <QuestionField
            label="¿Cuál es tu correo?"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            hint="Te enviamos un código de 6 dígitos. Sin contraseñas."
            className="text-[26px]"
            autoFocus
            required
            error={error}
          />
          <Button type="submit" className="min-w-48" loading={pending}>
            Enviar código <Icon name="arrow-right" size={18} />
          </Button>
        </form>
      </QuestionScreen>
    );
  }

  return (
    <QuestionScreen back={() => setStep({ kind: "email" })}>
      <form key="code" onSubmit={verifyCode} className="flex w-full flex-col items-center gap-10">
        <QuestionField
          label={`Código enviado a ${step.email}`}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          hint="Revisa también la carpeta de spam."
          className="font-condensed text-[52px] tracking-[0.3em] tabular"
          autoFocus
          required
          error={error}
        />
        <Button type="submit" className="min-w-48" loading={pending}>
          Entrar <Icon name="arrow-right" size={18} />
        </Button>
        <button type="button" onClick={() => setStep({ kind: "email" })} className="text-sm font-semibold text-brand">
          Usar otro correo
        </button>
      </form>
    </QuestionScreen>
  );
}
