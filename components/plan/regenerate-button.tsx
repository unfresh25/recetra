"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { generateWeek, refreshGeneratedWeek } from "@/lib/plan/actions";

export function RegenerateButton({ day }: { day: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("¿Armar de nuevo la semana? Se conservan las comidas que ya cocinaron.")) {
            startTransition(async () => {
              setError(undefined);
              try {
                const result = await generateWeek(day);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                await refreshGeneratedWeek();
              } catch {
                setError("No pudimos actualizar el plan. Intenta de nuevo.");
              }
            });
          }
        }}
        className="flex items-center gap-1.5 text-sm font-semibold text-brand disabled:opacity-50"
      >
        <Icon name="refresh" size={16} className={pending ? "animate-spin" : undefined} />
        {pending ? "Armando…" : "Rehacer semana"}
      </button>
      {error ? <p role="alert" className="max-w-56 text-right text-sm text-danger">{error}</p> : null}
    </div>
  );
}
