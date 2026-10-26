"use client";

import { FieldError, Input, InputOTP, REGEXP_ONLY_DIGITS, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ClearButton } from "@/components/ui/clear-button";
import { FlowScreen } from "@/components/ui/flow-screen";
import { Logo } from "@/components/ui/logo";
import { NextButton } from "@/components/ui/next-button";
import { createClient } from "@/lib/supabase/client";

// Loose on purpose: Supabase does the real validation; this only gates the button.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const CODE_LENGTH = 6;
const RESEND_AFTER_SECONDS = 30;

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/plan";
}

function sendOtp(email: string) {
  return createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
}

function sendErrorMessage(status?: number) {
  return status === 429 ? "Espera un momento antes de pedir otro código." : "No pudimos enviar el código. Revisa el correo.";
}

/** Borderless field chrome shared by the email input and the code: just the text. */
const bareText = "font-display text-[26px] leading-8 text-ink";

export function LoginForm() {
  const [email, setEmail] = useState<string>();
  return email ? (
    <CodeStep email={email} onBack={() => setEmail(undefined)} />
  ) : (
    <EmailStep onSent={setEmail} />
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!looksLikeEmail(email)) return;
    const address = email.trim().toLowerCase();
    setPending(true);
    setError(undefined);
    const { error } = await sendOtp(address);
    setPending(false);
    if (error) return setError(sendErrorMessage(error.status));
    onSent(address);
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <FlowScreen
        back="/welcome"
        title={
          <>
            Bienvenido a <Logo title="Mise" className="inline-block h-[0.7em] align-baseline" />{" "}
            {/* Working draws its dashes at x-height; nudge to the optical middle of the line. */}
            <span className="inline-block translate-y-[0.22em]">—</span>
            <br />
            <span className="text-[#8f8f8f]">todo en su lugar.</span>
          </>
        }
        action={<NextButton type="submit" loading={pending} isDisabled={!looksLikeEmail(email)} />}
      >
        <TextField
          name="email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setError(undefined);
          }}
          isInvalid={Boolean(error)}
          aria-label="Correo electrónico"
          autoFocus
          fullWidth
        >
          <div className="flex items-center gap-3">
            {/* Just the text: no field chrome, no focus ring. The caret is the affordance. */}
            <Input
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="tu@correo.com"
              className={`min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 ${bareText} caret-brand shadow-none outline-none placeholder:text-ink-faint/70 hover:bg-transparent focus:bg-transparent focus:ring-0 data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent data-[invalid=true]:bg-transparent`}
            />
            {email ? <ClearButton label="Borrar correo" onClear={() => setEmail("")} /> : null}
          </div>
          <FieldError className="mt-3 font-sans text-sm text-danger">{error}</FieldError>
        </TextField>
      </FlowScreen>
    </form>
  );
}

function CodeStep({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [wait, setWait] = useState(RESEND_AFTER_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH || pending) return;
    setPending(true);
    setError(undefined);
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setPending(false);
      setError("Código incorrecto o vencido.");
      return;
    }
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  }

  async function resend() {
    setError(undefined);
    setNotice(undefined);
    setWait(RESEND_AFTER_SECONDS);
    const { error } = await sendOtp(email);
    if (error) setError(sendErrorMessage(error.status));
    else setNotice("Te enviamos un código nuevo.");
  }

  return (
    <form ref={form} onSubmit={submit} className="flex flex-1 flex-col">
      <FlowScreen
        back={onBack}
        title="Ingresa el código que enviamos por correo."
        action={<NextButton type="submit" loading={pending} isDisabled={code.length !== CODE_LENGTH} />}
      >
        <div className="flex items-center gap-3">
          <InputOTP
            name="code"
            maxLength={CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            value={code}
            onChange={(value) => {
              setCode(value);
              setError(undefined);
            }}
            // Paste or SMS/email autofill completes the code: send it right away.
            onComplete={() => form.current?.requestSubmit()}
            isInvalid={Boolean(error)}
            aria-label={`Código enviado a ${email}`}
            autoComplete="one-time-code"
            autoFocus
            className="otp-bare w-auto flex-1"
          >
            <InputOTP.Group className="gap-2.5">
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <InputOTP.Slot
                  key={i}
                  index={i}
                />
              ))}
            </InputOTP.Group>
          </InputOTP>
          {code ? <ClearButton label="Borrar código" onClear={() => setCode("")} /> : null}
        </div>

        <div className="mt-4 flex flex-col items-start gap-2 font-sans text-sm">
          {error ? <p role="alert" className="text-danger">{error}</p> : null}
          <p className="text-ink-muted">
            {notice ?? <>Lo enviamos a {email}.</>}{" "}
            {wait > 0 ? (
              <span className="text-ink-faint">Reenviar en {wait} s</span>
            ) : (
              <button type="button" onClick={resend} className="font-medium text-ink underline underline-offset-2">
                Reenviar código
              </button>
            )}
          </p>
        </div>
      </FlowScreen>
    </form>
  );
}
