"use client";

import { useTransition } from "react";
import { setIngredientRole } from "@/lib/recipes/actions";
import { cn } from "@/lib/utils/cn";

/** While reviewing an import, tap to switch an ingredient between protagonist and garnish. */
export function IngredientRoleToggle({ recipeId, position, role }: { recipeId: string; position: number; role: "core" | "accessory" }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setIngredientRole(recipeId, position, role === "core" ? "accessory" : "core"))}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity",
        role === "core" ? "bg-sunken text-ink-muted" : "bg-teal-soft text-teal",
        pending && "opacity-50",
      )}
    >
      {role === "core" ? "Protagonista" : "Adorno"}
    </button>
  );
}
