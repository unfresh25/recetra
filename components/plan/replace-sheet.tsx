"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@heroui/react";
import { Icon } from "@/components/ui/icon";
import { getAlternatives, replaceMeal, type Alternative } from "@/lib/plan/actions";

const REASONS = [
  { value: "dislike", label: "No me gusta" },
  { value: "too_slow", label: "Muy demorada" },
  { value: "too_expensive", label: "Muy cara" },
  { value: "repeated", label: "Comida repetida" },
  { value: "not_today", label: "Solo hoy no" },
] as const;

export function ReplaceSheet({ planMealId, title, onClose }: { planMealId: string; title: string; onClose: () => void }) {
  const loadVersion = useRef(0);
  const [reason, setReason] = useState<string | null>(null);
  const [options, setOptions] = useState<Alternative[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string>();

  function load(next: string | null) {
    setReason(next);
    setError(undefined);
    const version = ++loadVersion.current;
    startLoading(async () => {
      try {
        const result = await getAlternatives(planMealId, next);
        if (version === loadVersion.current) setOptions(result);
      } catch {
        if (version === loadVersion.current) setError("No pudimos buscar opciones. Intenta de nuevo.");
      }
    });
  }

  function choose(recipeId: string) {
    setError(undefined);
    startSaving(async () => {
      try {
        const result = await replaceMeal(planMealId, recipeId, reason);
        if (result.error) setError(result.error);
        else onClose();
      } catch {
        setError("No pudimos reemplazarla. Intenta de nuevo.");
      }
    });
  }

  return (
    <Drawer.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }} isDismissable={!saving} isKeyboardDismissDisabled={saving} className="[--focus:var(--color-ink)]">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog aria-label="Reemplazar comida" className="mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pb-safe text-ink shadow-none [&_button:focus-visible]:outline-ink">
          <Drawer.Handle />
          {!saving ? <Drawer.CloseTrigger className="btn-ghost" aria-label="Cerrar"><Icon name="close" size={20} /></Drawer.CloseTrigger> : null}
          <Drawer.Header>
            <Drawer.Heading className="font-display text-[24px]">Reemplazar</Drawer.Heading>
            <p className="line-clamp-2 text-sm text-ink-muted">{title}</p>
          </Drawer.Header>
          <Drawer.Body>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">¿Por qué? (opcional)</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Button key={r.value} size="sm" disabled={saving} variant={reason === r.value ? "primary" : "secondary"} aria-pressed={reason === r.value} onPress={() => load(reason === r.value ? null : r.value)} className="h-9 border-line px-3 text-sm">
              {r.label}
            </Button>
          ))}
        </div>

        {options === null && !loading ? (
          <Button variant="secondary" size="md" block onPress={() => load(reason)}>
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
                    className="btn-outline flex w-full items-center gap-3 border-b border-line py-4 text-left disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{o.title}</span>
                      <span className="block text-sm text-ink-muted">
                        {o.minutes ? `${o.minutes} min` : "Tiempo sin definir"}
                        {o.adjustments.length ? ` · sin ${o.adjustments.map((a) => a.ingredientName.toLowerCase()).join(", ")}` : ""}
                      </span>
                    </span>
                    <Icon name="arrow-right" size={18} className="text-ink" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">No hay otras recetas aptas para este momento. Importa más recetas.</p>
          )
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm text-warning">{error}</p> : null}
          </Drawer.Body>
          <Drawer.Footer><Button variant="ghost" size="md" block disabled={saving} onPress={onClose}>Cancelar</Button></Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
