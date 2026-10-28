"use client";

import { Label, Radio, RadioGroup } from "@heroui/react";
import { useState, type FormEvent } from "react";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { SquareCheck } from "@/components/ui/square-check";
import { savePreferences } from "@/lib/onboarding/actions";
import type { Enums } from "@/lib/supabase/database.types";
import { useStepSave } from "../use-step-save";

type Option<T extends string> = { value: T; label: string; hint?: string };

const MEASUREMENTS: Option<Enums<"measurement_system">>[] = [
  { value: "metric", label: "Sistema métrico", hint: "Litros, gramos, miligramos, etc." },
  { value: "imperial", label: "Sistema imperial", hint: "Onzas, libras, pintas, etc." },
];

const TEMPERATURES: Option<Enums<"temperature_unit">>[] = [
  { value: "celsius", label: "Celsius °C" },
  { value: "fahrenheit", label: "Fahrenheit °F" },
];

/** A single-choice list drawn as Paper's rows: text on the left, a square check on the right. */
function ChoiceList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <RadioGroup value={value} onChange={(next) => onChange(next as T)} className="flex flex-col gap-0">
      <Label className="mb-3 font-display text-[16px] leading-5 font-normal text-[#8f8f8f]">{label}</Label>
      {options.map((option) => (
        <Radio key={option.value} value={option.value} className="btn-ghost w-full">
          <Radio.Content className="flex w-full items-center gap-4 py-3.5">
            {({ isSelected, isFocusVisible }) => (
              <>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[17px] leading-[22px] font-normal text-ink">{option.label}</span>
                  {option.hint ? (
                    <span className="font-sans text-[13px] leading-4 font-normal text-[#8f8f8f]">{option.hint}</span>
                  ) : null}
                </span>
                <SquareCheck checked={isSelected} focusVisible={isFocusVisible} />
              </>
            )}
          </Radio.Content>
        </Radio>
      ))}
    </RadioGroup>
  );
}

export function PreferencesStep({
  initialMeasurement,
  initialTemperature,
  progress,
  back,
  nextHref,
}: {
  initialMeasurement: Enums<"measurement_system">;
  initialTemperature: Enums<"temperature_unit">;
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  const [measurement, setMeasurement] = useState(initialMeasurement);
  const [temperature, setTemperature] = useState(initialTemperature);
  const { save, pending, error } = useStepSave(nextHref);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(() => savePreferences(measurement, temperature));
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <FlowScreen
        back={back ?? undefined}
        progress={progress}
        title="Tus preferencias en la cocina"
        subtitle="Las recetas inteligentes de Mise adaptan dinámicamente las instrucciones a tus preferencias."
        action={<NextButton type="submit" loading={pending} />}
      >
        <div className="flex flex-col gap-9">
          <ChoiceList label="Medidas" options={MEASUREMENTS} value={measurement} onChange={setMeasurement} />
          <ChoiceList label="Temperatura" options={TEMPERATURES} value={temperature} onChange={setTemperature} />
        </div>
        {error ? (
          <p role="alert" className="mt-6 font-sans text-sm text-danger">
            {error}
          </p>
        ) : null}
      </FlowScreen>
    </form>
  );
}
