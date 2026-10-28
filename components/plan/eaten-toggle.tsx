"use client";

import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { setEaten } from "@/lib/plan/actions";
import { cn } from "@/lib/utils/cn";

/** "La comimos": logs the meal for calories without opening cook mode. */
export function EatenToggle({ planMealId, eaten }: { planMealId: string; eaten: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(eaten);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setEaten(planMealId, !optimistic);
        })
      }
      className={cn("link-text mt-2 flex items-center gap-1.5 text-sm font-semibold", optimistic ? "text-savings" : "text-brand")}
    >
      <Icon name="check" size={16} />
      {optimistic ? "La comimos · deshacer" : "La comimos"}
    </button>
  );
}
