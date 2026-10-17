"use client";

import { Button } from "@/components/ui/button";

/** BitePal primary action: a content-width pill floating centered above the bottom edge. */
export function StepFooter({
  label = "Continuar",
  disabled,
  pending,
  error,
  onClick,
}: {
  label?: string;
  disabled?: boolean;
  pending?: boolean;
  error?: string;
  onClick: () => void;
}) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-auto flex flex-col items-center bg-canvas px-5 pt-4 pb-safe">
      {error ? (
        <p role="alert" className="mb-3 text-center text-sm text-brand">
          {error}
        </p>
      ) : null}
      <Button className="min-w-48" disabled={disabled} loading={pending} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}
