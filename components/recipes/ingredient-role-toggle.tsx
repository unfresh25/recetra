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
        "text-xs font-semibold underline decoration-dotted underline-offset-4 transition-opacity",
        role === "core" ? "text-ink-muted" : "text-teal",
        pending && "opacity-50",
      )}
    >
      {role === "core" ? "Protagonista" : "Adorno"}
    </button>
  );
}
