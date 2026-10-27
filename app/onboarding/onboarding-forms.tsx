"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";
import { AvatarPicker } from "@/components/onboarding/avatar-picker";
import { BareField } from "@/components/ui/bare-field";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { createHousehold } from "@/lib/household/actions";
import { parseInviteToken } from "@/lib/household/invite-token";
import { OWNER_ONBOARDING_TOTAL, onboardingProgress } from "@/lib/onboarding/steps";

type Step = "about" | "household" | "join";

type Profile = { fullName: string; displayName: string; avatarPath?: string };

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? "";

const HOUSEHOLD_IDEAS = (name: string) => [
  `Casa de ${name}`,
  `La cocina de ${name}`,
  "Mesa para dos",
  "El fogón",
  "La olla de la casa",
  "Sazón de casa",
];

/** "Cuéntanos acerca de ti", then the household's name (or an invite link). */
export function OnboardingForms({ userId, email }: { userId: string; email: string }) {
  const [step, setStep] = useState<Step>("about");
  const [profile, setProfile] = useState<Profile>({ fullName: "", displayName: "" });

  if (step === "join") return <JoinStep onBack={() => setStep("about")} />;
  if (step === "household") return <HouseholdStep profile={profile} onBack={() => setStep("about")} />;

  return (
    <AboutStep
      userId={userId}
      email={email}
      profile={profile}
      onChange={setProfile}
      onNext={() => setStep("household")}
      onJoin={() => setStep("join")}
    />
  );
}

function AboutStep({
  userId,
  email,
  profile,
  onChange,
  onNext,
  onJoin,
}: {
  userId: string;
  email: string;
  profile: Profile;
  onChange: (profile: Profile) => void;
  onNext: () => void;
  onJoin: () => void;
}) {
  const [photoError, setPhotoError] = useState<string>();
  const suggestedNickname = firstName(profile.fullName);
  const ready = profile.fullName.trim().length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    // An empty nickname falls back to the first name, which is what the placeholder promises.
    onChange({ ...profile, displayName: profile.displayName.trim() || suggestedNickname });
    onNext();
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <FlowScreen
        progress={onboardingProgress(1, OWNER_ONBOARDING_TOTAL)}
        title="Cuéntanos acerca de ti"
        titleAside={
          <AvatarPicker
            userId={userId}
            onChange={(avatarPath) => onChange({ ...profile, avatarPath })}
            onError={setPhotoError}
          />
        }
        action={<NextButton type="submit" isDisabled={!ready} />}
        secondaryAction={
          <button type="button" onClick={onJoin} className="link-text text-left font-sans text-[14px] text-ink-muted">
            ¿Te invitaron? <span className="text-ink underline underline-offset-2">Usa tu link</span>
          </button>
        }
      >
        {photoError ? (
          <p role="alert" className="-mt-8 mb-8 font-sans text-sm text-danger">
            {photoError}
          </p>
        ) : null}
        <div className="flex flex-col gap-8">
          <BareField
            label="Tu nombre"
            name="fullName"
            value={profile.fullName}
            onChange={(fullName) => onChange({ ...profile, fullName })}
            placeholder="Nombre completo"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
            autoFocus
          />
          <BareField
            label="¿Cómo deberíamos decirte?"
            name="displayName"
            value={profile.displayName}
            onChange={(displayName) => onChange({ ...profile, displayName })}
            placeholder={suggestedNickname || "Tu apodo"}
            autoComplete="nickname"
            autoCapitalize="words"
            maxLength={40}
          />
          <div className="flex flex-col gap-2.5">
            <span className="font-display text-[16px] leading-5 text-[#8f8f8f]">Correo electrónico</span>
            <span className="truncate font-display text-[24px] leading-[30px] text-ink">{email}</span>
          </div>
        </div>
      </FlowScreen>
    </form>
  );
}

function HouseholdStep({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const [state, action, pending] = useActionState(createHousehold, undefined);
  const ideas = HOUSEHOLD_IDEAS(profile.displayName);
  const [household, setHousehold] = useState("");

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="fullName" value={profile.fullName} />
      <input type="hidden" name="displayName" value={profile.displayName} />
      <input type="hidden" name="avatarPath" value={profile.avatarPath ?? ""} />
      <FlowScreen
        back={onBack}
        progress={onboardingProgress(2, OWNER_ONBOARDING_TOTAL)}
        title="¿Cómo se llama tu hogar?"
        subtitle="Después podrás invitar a tu pareja."
        action={<NextButton type="submit" loading={pending} isDisabled={!household.trim()} />}
      >
        <BareField
          aria-label="Nombre del hogar"
          name="householdName"
          size="lg"
          value={household}
          onChange={setHousehold}
          placeholder={ideas[0]}
          maxLength={60}
          error={state?.error}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setHousehold((current) => ideas[(ideas.indexOf(current) + 1) % ideas.length]!)}
          className="link-text mt-5 self-start font-sans text-[14px] text-ink"
        >
          Sugerir un nombre
        </button>
      </FlowScreen>
    </form>
  );
}

function JoinStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = parseInviteToken(link);
    if (!token) return setError("Pega el link completo que te enviaron.");
    router.push(`/invite/${token}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <FlowScreen
        back={onBack}
        progress={onboardingProgress(1, OWNER_ONBOARDING_TOTAL)}
        title="Pega tu link de invitación"
        subtitle="Si te llegó por WhatsApp o correo, también puedes abrirlo directamente."
        action={<NextButton type="submit" isDisabled={!link.trim()} />}
      >
        <BareField
          aria-label="Link de invitación"
          name="invite"
          value={link}
          onChange={(value) => {
            setLink(value);
            setError(undefined);
          }}
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="https://…/invite/…"
          error={error}
          autoFocus
        />
      </FlowScreen>
    </form>
  );
}
