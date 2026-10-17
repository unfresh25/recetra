"use client";

import { Icon } from "@/components/ui/icon";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { generateWeek } from "@/lib/plan/actions";

const STEPS = ["Revisando sus preferencias", "Eligiendo recetas para los dos", "Cuidando alergias y lo que no comen", "¡Su plan está listo!"];

/** First visit of the week: builds the plan automatically, Recipy-style progress. */
export function GenerateWeek({ day }: { day: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 2)), 700);
    generateWeek(day).then((result) => {
      clearInterval(timer);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep(STEPS.length - 1);
      router.refresh();
    });
    return () => clearInterval(timer);
  }, [day, router]);

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <Illustration name="welcome-plan" size={180} preload className="animate-[pulse_2.4s_ease-in-out_infinite]" />
      <ul className="flex w-full flex-col gap-4 py-2 text-left">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex size-7 items-center justify-center rounded-full text-sm ${
                i < step || step === STEPS.length - 1 ? "bg-savings text-white" : i === step ? "border-2 border-brand border-r-transparent animate-spin" : "bg-sunken"
              }`}
            >
              {i < step || step === STEPS.length - 1 ? <Icon name="check" size={16} /> : null}
            </span>
            <span className={i <= step ? "font-semibold" : "text-ink-muted"}>{label}</span>
          </li>
        ))}
      </ul>
      {error ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-brand">{error}</p>
          <Button size="md" onClick={() => location.reload()}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
