"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/onboarding/actions";
import { OptionCard } from "../option-card";
import { StepFooter } from "../step-footer";
import { useStepSave } from "../use-step-save";

type Option = { value: string; emoji: string; label: string; description?: string };

/**
 * Grid of option cards. `noneLabel` adds an exclusive "Ninguna" card (allergies, diets);
 * `max` caps the selection (styles).
 */
export function MultiSelectStep({
  options,
  initial,
  nextHref,
  onSave,
  min = 0,
  max,
  noneLabel,
  footerLabel,
}: {
  options: Option[];
  initial: string[];
  nextHref: string;
  onSave: (values: string[]) => Promise<ActionResult>;
  min?: number;
  max?: number;
  noneLabel?: string;
  footerLabel?: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initial));
  // "Ninguna" must be an explicit answer; a fresh screen starts unanswered.
  const [noneChosen, setNoneChosen] = useState(false);
  const { save, pending, error } = useStepSave(nextHref);
  const atMax = max !== undefined && selected.size >= max;

  function toggle(value: string) {
    setNoneChosen(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else if (!atMax) next.add(value);
      return next;
    });
  }

  const answered = noneLabel ? noneChosen || selected.size > 0 || initial.length > 0 : selected.size >= min;

  return (
    <>
      {max !== undefined ? (
        <p className="-mt-3 mb-4 text-right text-sm font-semibold text-ink-muted tabular" aria-live="polite">
          {selected.size}/{max}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {noneLabel ? (
          <OptionCard
            selected={noneChosen}
            onToggle={() => {
              setNoneChosen((v) => !v);
              setSelected(new Set());
            }}
            emoji="🚫"
            label={noneLabel}
          />
        ) : null}
        {options.map((option) => (
          <OptionCard
            key={option.value}
            selected={selected.has(option.value)}
            onToggle={() => toggle(option.value)}
            emoji={option.emoji}
            label={option.label}
            description={option.description}
            disabled={atMax}
          />
        ))}
      </div>
      <StepFooter
        label={footerLabel}
        disabled={!answered || selected.size < min}
        pending={pending}
        error={error}
        onClick={() => save(() => onSave([...selected]))}
      />
    </>
  );
}
