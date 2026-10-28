"use client";

import { Drawer } from "@heroui/react";
import { Icon } from "@/components/ui/icon";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanLoader } from "@/components/ui/pan-loader";
import { completeWeek, refreshGeneratedWeek } from "@/lib/plan/actions";
import { cn } from "@/lib/utils/cn";
import { GENERATION_STEPS, trackGeneration } from "./generation-progress";
import styles from "./complete-week.module.css";

/** Completion always starts from an explicit tap. */
export function CompleteWeek({ weekStart, hero = false }: { weekStart: string; hero?: boolean }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <>
    <Button size={hero ? "md" : "sm"} variant={hero ? "primary" : "secondary"} onPress={() => setOpen(true)} className={hero ? "" : "shrink-0 px-3 text-[12px]"}>
      {hero ? "Completar semana automáticamente" : "Completar semana"}
    </Button>
    <Drawer.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable={false} isKeyboardDismissDisabled className="[--focus:var(--color-ink)]">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog aria-label="Completando semana" className="mx-auto w-full max-w-xl bg-canvas px-5 pb-safe text-ink shadow-none">
          <Drawer.Handle />
          <Drawer.Header className="sr-only"><Drawer.Heading>Completar semana</Drawer.Heading></Drawer.Header>
          <Drawer.Body><ActiveGeneration key={attempt} weekStart={weekStart} onRevealed={() => setOpen(false)} onRetry={() => setAttempt((value) => value + 1)} /></Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  </>;
}

function ActiveGeneration({ weekStart, onRevealed, onRetry }: { weekStart: string; onRevealed: () => void; onRetry: () => void }) {
  const reveal = useEffectEvent(onRevealed);
  const request = useRef<ReturnType<typeof completeWeek> | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const complete = step === GENERATION_STEPS.length;

  useEffect(() => {
    // Reuse the mutation if Strict Mode replays the effect; each subscription cleans up its timers.
    request.current ??= completeWeek(weekStart);
    return trackGeneration(request.current, {
      onStep: setStep,
      onError: setError,
      onComplete: async () => { await refreshGeneratedWeek(); reveal(); },
    });
  }, [weekStart]);

  return (
    <div aria-busy={!complete && !error} className="flex flex-col items-center gap-6 py-8 text-center">
      <PanLoader size={180} label={error ? "No pudimos armar tu semana" : complete ? "Tu semana está lista" : "Armando tu semana…"} />
      <h2 aria-live="polite" className="font-display text-[28px] leading-[34px] text-ink">
        {complete ? "¡Tu semana está lista!" : "Registrando tus preferencias"}
      </h2>
      <ol aria-label="Progreso del plan" className="flex w-full max-w-80 flex-col gap-[14px] text-left">
        {GENERATION_STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-ink" : !current ? "border border-[#a9a9a9]" : undefined,
                )}
              >
                {done ? <Icon name="check" size={12} className="text-canvas" /> : current ? (
                  <span className={cn("size-2 rounded-full bg-ink", !error && styles.currentDot)} />
                ) : null}
              </span>
              <span className={cn("font-display text-[17px] leading-6", i <= step ? "text-ink" : "text-[#8f8f8f]")}>
                {done ? <span className="sr-only">Completado: </span> : null}
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {error ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="font-sans text-sm text-danger">{error}</p>
          <Button size="md" onPress={onRetry}>
            Reintentar
          </Button>
          <Button size="sm" variant="ghost" onPress={onRevealed}>Volver al plan</Button>
        </div>
      ) : null}
    </div>
  );
}
