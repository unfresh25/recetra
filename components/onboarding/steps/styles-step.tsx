"use client";

import { saveStyles } from "@/lib/onboarding/actions";
import { MAX_STYLES, STYLE_OPTIONS } from "@/lib/onboarding/options";
import { PhotoOptionStep } from "../photo-option-step";

export function StylesStep({
  initial,
  progress,
  back,
  nextHref,
}: {
  initial: string[];
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  return (
    <PhotoOptionStep
      title="¿Cuál es tu estilo de preparación?"
      subtitle="Elige los estilos que más te definen a la hora de cocinar."
      options={STYLE_OPTIONS}
      initial={initial}
      min={1}
      max={MAX_STYLES}
      onSave={saveStyles}
      progress={progress}
      back={back}
      nextHref={nextHref}
    />
  );
}
