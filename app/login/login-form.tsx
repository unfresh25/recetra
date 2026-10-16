"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
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
      <form key="email" onSubmit={sendCode} className="flex flex-1 flex-col gap-6">
        <TextField
          label="Correo"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          error={error}
        />
        <div className="mt-auto pb-safe">
          <Button type="submit" block loading={pending}>
            Enviar código
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form key="code" onSubmit={verifyCode} className="flex flex-1 flex-col gap-6">
      <TextField
        label={`Código enviado a ${step.email}`}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="••••••"
        className="text-center font-display text-3xl tracking-[0.5em]"
        autoFocus
        required
        error={error}
      />
      <button
        type="button"
        onClick={() => setStep({ kind: "email" })}
        className="self-start text-sm font-semibold text-brand"
      >
        Usar otro correo
      </button>
      <div className="mt-auto pb-safe">
        <Button type="submit" block loading={pending}>
          Entrar
        </Button>
      </div>
    </form>
  );
}
