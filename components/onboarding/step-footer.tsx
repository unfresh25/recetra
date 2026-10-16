"use client";

import { Button } from "@/components/ui/button";

/** Sticky bottom action, like Recipy's "Continuar". */
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
    <div className="sticky bottom-0 -mx-5 mt-auto bg-gradient-to-t from-canvas from-70% to-transparent px-5 pt-8 pb-safe">
      {error ? (
        <p role="alert" className="mb-3 text-center text-sm text-brand">
          {error}
        </p>
      ) : null}
      <Button block disabled={disabled} loading={pending} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}
