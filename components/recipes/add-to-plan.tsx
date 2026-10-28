"use client";

import { Drawer } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { PlanSearchContext } from "@/lib/plan/search-context";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { placeRecipeInPlan } from "@/lib/plan/actions";
import { defaultPlacement, placementDays, type PlacementWeek } from "@/lib/plan/placement";
import type { MealType } from "@/lib/plan/types";
import { mondayOf } from "@/lib/plan/week";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "@/lib/recipes/labels";

export function AddToPlan({ recipeId, mealTypes, weeks, today, onAdded, planContext }: {
  planContext?: PlanSearchContext | null;
  recipeId: string;
  mealTypes: MealType[];
  weeks: PlacementWeek[];
  today: string;
  onAdded: (day: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(planContext));
  const [weekStart, setWeekStart] = useState(planContext ? mondayOf(planContext.day) : weeks[0]?.weekStart ?? mondayOf(today));
  const [selection, setSelection] = useState(() => planContext ?? defaultPlacement(weekStart, today, mealTypes));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const week = weeks.find((entry) => entry.weekStart === weekStart) ?? weeks[0];
  const slot = week?.slots.find((entry) => entry.day === selection.day && entry.mealType === selection.mealType);

  function save() {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await placeRecipeInPlan(recipeId, selection.day, selection.mealType);
        if (result.error) setError(result.error);
        else {
          setOpen(false);
          if (planContext) router.push(`/plan?week=${mondayOf(selection.day)}`);
          else onAdded(selection.day);
        }
      } catch {
        setError("No pudimos agregar la receta al plan. Intenta de nuevo.");
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onPress={() => { setError(undefined); setOpen(true); }} className="h-[38px] shrink-0 gap-2 border-line px-4 text-[13.5px] shadow-none">
        <Icon name="calendar" size={18} /> Al plan
      </Button>
      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable={!pending} isKeyboardDismissDisabled={pending} className="[--focus:var(--color-ink)]">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pb-safe text-ink shadow-none [--focus:var(--color-ink)] [&_button:focus-visible]:outline-ink [&_a:focus-visible]:outline-ink">
            <Drawer.Handle />
            {!pending ? <Drawer.CloseTrigger className="btn-ghost" aria-label="Cerrar"><Icon name="close" size={20} /></Drawer.CloseTrigger> : null}
            <Drawer.Header><Drawer.Heading className="font-display text-[24px]">Agregar al plan</Drawer.Heading></Drawer.Header>
            <Drawer.Body className="flex flex-col gap-5">
              {week ? <>
                <div role="group" aria-label="Semana" className="flex flex-wrap gap-2">
                  {weeks.map((entry) => <Button key={entry.weekStart} size="sm" variant={week.weekStart === entry.weekStart ? "primary" : "secondary"} disabled={pending} aria-pressed={week.weekStart === entry.weekStart} onPress={() => {
                    setWeekStart(entry.weekStart);
                    setSelection(defaultPlacement(entry.weekStart, today, mealTypes));
                    setError(undefined);
                  }} className="border-line shadow-none">
                    {entry.weekStart === mondayOf(today) ? "Esta semana" : "Próxima semana"}
                  </Button>)}
                </div>
                <div role="group" aria-label="Día" className="grid grid-cols-7 gap-1">
                  {placementDays(week.weekStart, today).map((entry) => <button key={entry.day} type="button" disabled={pending || entry.disabled} aria-pressed={selection.day === entry.day} onClick={() => { setSelection({ ...selection, day: entry.day }); setError(undefined); }} className={`flex min-h-14 flex-col items-center justify-center rounded-full border font-display text-xs disabled:opacity-35 ${selection.day === entry.day ? "btn-ink border-ink bg-ink text-canvas" : "btn-outline border-line"}`}>
                    <span>{entry.label.split(" ")[0]}</span><span className="mt-1 text-sm tabular">{entry.label.split(" ")[1]}</span>
                  </button>)}
                </div>
                <div role="group" aria-label="Comida" className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map((mealType) => <Button key={mealType} size="sm" disabled={pending} variant={selection.mealType === mealType ? "primary" : "secondary"} aria-pressed={selection.mealType === mealType} onPress={() => { setSelection({ ...selection, mealType }); setError(undefined); }} className="border-line shadow-none">{MEAL_TYPE_LABELS[mealType]}</Button>)}
                </div>
                <p className="text-sm text-ink-muted" aria-live="polite">
                  En el plan: {slot?.title ?? "libre"}
                </p>
              </> : null}
              {error ? <p role="alert" className="text-sm text-ink">{error}</p> : null}
            </Drawer.Body>
            {week ? <Drawer.Footer><Button block size="md" loading={pending} disabled={selection.day < today} onPress={save} className="bg-ink text-white shadow-none">Agregar al plan</Button></Drawer.Footer> : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
