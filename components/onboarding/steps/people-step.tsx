"use client";

import { useState } from "react";
import { DrawablyButton, DrawablyToggle } from "@/components/ui/drawably";
import { Icon } from "@/components/ui/icon";
import { savePeople } from "@/lib/onboarding/actions";
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
  return (
    <div className="flex items-center justify-center gap-6" role="group" aria-label={label}>
      <DrawablyButton type="button" aria-label={`Menos ${label}`} tone="neutral" className="size-16" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Icon name="minus" size={26} />
      </DrawablyButton>
      <span aria-live="polite" className="w-20 text-center font-condensed text-[88px] font-extrabold leading-none text-brand tabular">
        {value}
      </span>
      <DrawablyButton type="button" aria-label={`Más ${label}`} variant="solid" className="size-16" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="add" size={26} />
      </DrawablyButton>
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
        <p aria-hidden className="flex gap-1 text-ink-muted">
          {Array.from({ length: Math.min(adults, 6) }, (_, i) => (
            <Icon key={i} name="user" size={24} />
          ))}
        </p>
      </div>

      <label className="mt-10 flex items-center justify-between py-3">
        <span className="flex items-center gap-3 text-[17px] font-semibold">
          <Icon name="baby" size={24} />
          ¿Hay niños?
        </span>
        <DrawablyToggle role="switch" checked={hasKids} onChange={(e) => setHasKids(e.target.checked)} aria-label="Hay niños" />
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
