"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { QuestionField } from "@/components/ui/question-field";
import { QuestionScreen } from "@/components/ui/question-screen";
import { createHousehold } from "@/lib/household/actions";
import { parseInviteToken } from "@/lib/household/invite-token";

type Step = "name" | "household" | "join";

const HOUSEHOLD_IDEAS = (name: string) => [
  `Casa de ${name}`,
  `La cocina de ${name}`,
  "Mesa para dos",
  "El fogón",
  "La olla de la casa",
  "Sazón de casa",
];

/** One question per screen: your name, then the household's (or the invite link). */
export function OnboardingForms() {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");

  if (step === "join") return <JoinStep onBack={() => setStep("name")} />;
  if (step === "household") return <HouseholdStep name={name} onBack={() => setStep("name")} />;

  return (
    <QuestionScreen>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setStep("household");
        }}
        className="flex w-full flex-1 flex-col items-center gap-10"
      >
        <QuestionField
          label="¿Cómo te llamas?"
          name="displayName"
          autoComplete="given-name"
          placeholder="Tu nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          autoFocus
          required
        />
        <Button type="submit" className="min-w-40">
          Siguiente <Icon name="arrow-right" size={18} />
        </Button>
        <button type="button" onClick={() => setStep("join")} className="mt-auto pb-safe text-[15px] text-ink-muted">
          ¿Te invitaron? <span className="font-semibold text-brand">Usa tu link</span>
        </button>
      </form>
    </QuestionScreen>
  );
}

function HouseholdStep({ name, onBack }: { name: string; onBack: () => void }) {
  const [state, action, pending] = useActionState(createHousehold, undefined);
  const ideas = HOUSEHOLD_IDEAS(name.trim().split(/\s+/)[0] ?? name);
  const [household, setHousehold] = useState("");

  return (
    <QuestionScreen back={onBack}>
      <form action={action} className="flex w-full flex-col items-center gap-10">
        <input type="hidden" name="displayName" value={name} />
        <QuestionField
          label="Ponle nombre a tu hogar"
          name="householdName"
          placeholder={ideas[0]}
          value={household}
          onChange={(event) => setHousehold(event.target.value)}
          maxLength={60}
          hint="Después podrás invitar a tu pareja."
          autoFocus
          required
          error={state?.error}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Sugerir un nombre"
            onClick={() => setHousehold((current) => ideas[(ideas.indexOf(current) + 1) % ideas.length]!)}
            className="flex size-14 items-center justify-center rounded-full bg-surface text-ink"
          >
            <Icon name="sparkles" size={22} />
          </button>
          <Button type="submit" className="min-w-40" loading={pending}>
            Crear hogar <Icon name="arrow-right" size={18} />
          </Button>
        </div>
      </form>
    </QuestionScreen>
  );
}

function JoinStep({ onBack }: { onBack: () => void }) {
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
    <QuestionScreen back={onBack}>
      <form onSubmit={onSubmit} className="flex w-full flex-col items-center gap-10">
        <QuestionField
          label="Pega tu link de invitación"
          name="invite"
          inputMode="url"
          autoCapitalize="none"
          placeholder="recetra.vercel.app/invite/…"
          hint="Si te llegó por WhatsApp o correo, también puedes abrirlo directamente."
          className="text-[22px]"
          autoFocus
          required
          error={error}
        />
        <Button type="submit" className="min-w-40">
          Continuar <Icon name="arrow-right" size={18} />
        </Button>
      </form>
    </QuestionScreen>
  );
}
