"use client";

import { useState } from "react";
import { saveBudget } from "@/lib/onboarding/actions";
import { BUDGET, budgetTier, formatCop } from "@/lib/onboarding/options";
import { StepFooter } from "../step-footer";
import { useStepSave } from "../use-step-save";

export function BudgetStep({ initial, nextHref }: { initial: number | null; nextHref: string }) {
  const [value, setValue] = useState(initial ?? BUDGET.default);
  const { save, pending, error } = useStepSave(nextHref);
  const tier = budgetTier(value);
  const percent = ((value - BUDGET.min) / (BUDGET.max - BUDGET.min)) * 100;

  return (
    <>
      <div className="flex flex-col items-center gap-1 pt-10 text-center">
        <p className="font-display text-[44px] font-extrabold leading-none text-brand tabular">{formatCop(value)}</p>
        <p className="text-[15px] text-ink-muted">por semana</p>
        <p className="mt-6 font-display text-xl font-bold">{tier.label}</p>
        <p className="text-[15px] text-ink-muted">{tier.description}</p>
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <input
          type="range"
          min={BUDGET.min}
          max={BUDGET.max}
          step={BUDGET.step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Presupuesto semanal"
          aria-valuetext={formatCop(value)}
          style={{ background: `linear-gradient(to right, var(--color-brand) ${percent}%, var(--color-sunken) ${percent}%)` }}
          className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-9 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:"
        />
        <div className="flex justify-between text-sm text-ink-muted tabular">
          <span>{formatCop(BUDGET.min)}</span>
          <span>{formatCop(BUDGET.max)}+</span>
        </div>
      </div>

      <StepFooter pending={pending} error={error} onClick={() => save(() => saveBudget(value))} />
    </>
  );
}
