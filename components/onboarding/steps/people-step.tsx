"use client";

import { useState } from "react";
import { savePeople } from "@/lib/onboarding/actions";
import { cn } from "@/lib/utils/cn";
import { StepFooter } from "../step-footer";
import { useStepSave } from "../use-step-save";

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const button =
    "flex size-16 items-center justify-center rounded-full font-display text-3xl font-bold transition-transform active:scale-95 disabled:opacity-35";
  return (
    <div className="flex items-center justify-center gap-6" role="group" aria-label={label}>
      <button type="button" aria-label={`Menos ${label}`} className={cn(button, "bg-surface text-ink shadow-card")} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span aria-live="polite" className="w-20 text-center font-display text-[72px] font-extrabold leading-none text-brand tabular">
        {value}
      </span>
      <button type="button" aria-label={`Más ${label}`} className={cn(button, "bg-brand text-white")} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function PeopleStep({ adults: initialAdults, kids: initialKids, nextHref }: { adults: number; kids: number; nextHref: string }) {
  const [adults, setAdults] = useState(initialAdults);
  const [hasKids, setHasKids] = useState(initialKids > 0);
  const [kids, setKids] = useState(Math.max(initialKids, 1));
  const { save, pending, error } = useStepSave(nextHref);

  return (
    <>
      <div className="flex flex-col items-center gap-3 pt-6">
        <Stepper label="adultos" value={adults} min={1} max={12} onChange={setAdults} />
        <p className="text-[15px] text-ink-muted">{adults === 1 ? "adulto" : "adultos"}</p>
        <p aria-hidden className="text-3xl tracking-widest">{"🧑".repeat(Math.min(adults, 6))}</p>
      </div>

      <label className="mt-10 flex items-center justify-between rounded-card bg-surface px-5 py-4 shadow-card">
        <span className="flex items-center gap-3 font-semibold">
          <span aria-hidden className="text-2xl">👶</span>¿Hay niños?
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={hasKids}
          onChange={(e) => setHasKids(e.target.checked)}
          className="relative h-8 w-14 cursor-pointer appearance-none rounded-full bg-sunken transition-colors checked:bg-brand before:absolute before:left-1 before:top-1 before:size-6 before:rounded-full before:bg-white before:shadow before:transition-transform checked:before:translate-x-6"
        />
      </label>
      {hasKids ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Stepper label="niños" value={kids} min={1} max={12} onChange={setKids} />
          <p className="text-[15px] text-ink-muted">{kids === 1 ? "niño" : "niños"}</p>
        </div>
      ) : null}

      <StepFooter pending={pending} error={error} onClick={() => save(() => savePeople(adults, hasKids ? kids : 0))} />
    </>
  );
}
