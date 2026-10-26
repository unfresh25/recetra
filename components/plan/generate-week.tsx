"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanLoader } from "@/components/ui/pan-loader";
import { generateWeek, refreshGeneratedWeek } from "@/lib/plan/actions";
import { cn } from "@/lib/utils/cn";
import { GENERATION_STEPS, trackGeneration } from "./generation-progress";
import styles from "./generate-week.module.css";

/** Current weeks start on arrival; future weeks wait for a tap. */
export function GenerateWeek({ day, auto = true }: { day: string; auto?: boolean }) {
  const [go, setGo] = useState(auto);

  if (!go) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="font-display text-xl font-bold">Esta semana aún no tiene plan</p>
        <p className="text-[15px] text-ink-muted">Ármala ahora y compra con tiempo.</p>
        <Button onClick={() => setGo(true)}>Armar esta semana</Button>
      </div>
    );
  }

  return <ActiveGeneration key={day} day={day} />;
}

function ActiveGeneration({ day }: { day: string }) {
  const request = useRef<ReturnType<typeof generateWeek> | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const complete = step === GENERATION_STEPS.length;

  useEffect(() => {
    // Reuse the mutation if Strict Mode replays the effect; each subscription cleans up its timers.
    request.current ??= generateWeek(day);
    return trackGeneration(request.current, {
      onStep: setStep,
      onError: setError,
      onComplete: refreshGeneratedWeek,
    });
  }, [day]);

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
                {done ? <Image src="/icons/Check.svg" alt="" width={12} height={12} /> : current ? (
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
          <Button size="md" onClick={() => location.reload()}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
