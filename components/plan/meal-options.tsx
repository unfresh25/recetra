"use client";

import { Drawer } from "@heroui/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { removeFromPlan, setEaten } from "@/lib/plan/actions";
import type { PlanMealView } from "@/lib/plan/queries";
import { ReplaceSheet } from "./replace-sheet";

const actionClass = "!h-[52px] !rounded-none !px-0 justify-start border-b border-line text-ink last-of-type:border-b-0";

export function MealOptions({ meal, today, readOnly }: { meal: PlanMealView; today: string; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const cooked = meal.status === "cooked";
  const title = meal.recipe?.title ?? "comida";

  function save(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) setError(result.error);
        else setOpen(false);
      } catch {
        setError("No pudimos guardar el cambio. Intenta de nuevo.");
      }
    });
  }

  return <>
    <Button isIconOnly size="sm" variant="ghost" onPress={() => { setError(undefined); setOpen(true); }} aria-label={`Opciones de ${title}`} className="size-9 p-0"><Icon name="more" size={22} /></Button>
    <Drawer.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable={!pending} isKeyboardDismissDisabled={pending} className="[--focus:var(--color-ink)]">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pb-safe text-ink shadow-none [&_button:focus-visible]:outline-ink">
          <Drawer.Handle />
          {!pending ? <Drawer.CloseTrigger className="btn-ghost" aria-label="Cerrar"><Icon name="close" size={20} /></Drawer.CloseTrigger> : null}
          <Drawer.Header><Drawer.Heading className="pr-8 font-display text-[24px]">{title}</Drawer.Heading></Drawer.Header>
          <Drawer.Body className="flex flex-col gap-0">
            {!readOnly ? <>
              <Button variant="ghost" block size="md" disabled={pending || cooked} onPress={() => { setOpen(false); setReplacing(true); }} className={actionClass}><Icon name="refresh" size={20} /><span className="font-display text-[17px]">Reemplazar</span></Button>
              <Button variant="ghost" block size="md" disabled={pending || cooked} onPress={() => save(() => removeFromPlan(meal.id))} className={actionClass}><Icon name="delete" size={20} /><span className="font-display text-[17px]">Quitar del plan</span></Button>
            </> : null}
            {meal.day <= today ? <Button variant="ghost" block size="md" disabled={pending} onPress={() => save(() => setEaten(meal.id, !cooked))} className={actionClass}><Icon name="check" size={20} /><span className="font-display text-[17px]">{cooked ? "No la comí" : "Ya la comí"}</span></Button> : null}
            {error ? <p role="alert" className="text-sm text-warning">{error}</p> : null}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
    {replacing ? <ReplaceSheet planMealId={meal.id} title={title} onClose={() => setReplacing(false)} /> : null}
  </>;
}
