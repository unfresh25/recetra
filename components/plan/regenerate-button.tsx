"use client";

import { useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { generateWeek } from "@/lib/plan/actions";

export function RegenerateButton({ day }: { day: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Armar de nuevo la semana? Se conservan las comidas que ya cocinaron.")) {
          startTransition(async () => {
            await generateWeek(day);
          });
        }
      }}
      className="flex items-center gap-1.5 text-sm font-semibold text-brand disabled:opacity-50"
    >
      <Icon name="refresh" size={16} className={pending ? "animate-spin" : undefined} />
      {pending ? "Armando…" : "Rehacer semana"}
    </button>
  );
}
