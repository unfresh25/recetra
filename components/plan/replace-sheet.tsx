"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { getAlternatives, replaceMeal, type Alternative } from "@/lib/plan/actions";

const REASONS = [
  { value: "dislike", label: "No me gusta" },
  { value: "too_slow", label: "Muy demorada" },
  { value: "too_expensive", label: "Muy cara" },
  { value: "repeated", label: "Comida repetida" },
  { value: "not_today", label: "Solo hoy no" },
] as const;

export function ReplaceButton({ planMealId, title }: { planMealId: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Reemplazar ${title}`}
        className="flex size-9 shrink-0 items-center justify-center text-ink-muted transition-colors hover:text-brand"
      >
        <Icon name="refresh" size={18} />
      </button>
      {open ? <ReplaceSheet planMealId={planMealId} title={title} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ReplaceSheet({ planMealId, title, onClose }: { planMealId: string; title: string; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [options, setOptions] = useState<Alternative[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string>();

  function load(next: string | null) {
    setReason(next);
    startLoading(async () => setOptions(await getAlternatives(planMealId, next)));
  }

  function choose(recipeId: string) {
    setError(undefined);
    startSaving(async () => {
      const result = await replaceMeal(planMealId, recipeId, reason);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Reemplazar comida"
        className="mx-auto max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-canvas px-5 pt-3 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
        <p className="font-display text-xl font-bold">Reemplazar</p>
        <p className="mb-4 line-clamp-1 text-sm text-ink-muted">{title}</p>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">¿Por qué? (opcional)</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Chip key={r.value} selected={reason === r.value} onClick={() => load(reason === r.value ? null : r.value)} className="h-9 px-3 text-sm">
              {r.label}
            </Chip>
          ))}
        </div>

        {options === null && !loading ? (
          <Button variant="secondary" size="md" block onClick={() => load(reason)}>
            Ver opciones
          </Button>
        ) : null}
        {loading ? <p className="py-6 text-center text-sm text-ink-muted">Buscando opciones…</p> : null}
        {options && !loading ? (
          options.length ? (
            <ul className="flex flex-col gap-2">
              {options.map((o) => (
                <li key={o.recipeId}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => choose(o.recipeId)}
                    className="flex w-full items-center gap-3 border-b border-line py-4 text-left disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{o.title}</span>
                      <span className="block text-sm text-ink-muted">
                        {o.minutes ? `${o.minutes} min` : "Tiempo sin definir"}
                        {o.adjustments.length ? ` · sin ${o.adjustments.map((a) => a.ingredientName.toLowerCase()).join(", ")}` : ""}
                      </span>
                    </span>
                    <Icon name="arrow-right" size={18} className="text-brand" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">No hay otras recetas aptas para este momento. Importa más recetas.</p>
          )
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm text-brand">{error}</p> : null}
        <button type="button" onClick={onClose} className="mt-3 h-12 w-full font-semibold text-ink-muted">
          Cancelar
        </button>
      </div>
    </div>
  );
}
