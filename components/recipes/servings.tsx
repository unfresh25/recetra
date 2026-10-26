"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const ServingsContext = createContext<{
  servings: number;
  setServings: (value: number) => void;
} | null>(null);

export function ServingsProvider({ initialServings, children }: { initialServings: number; children: ReactNode }) {
  const [servings, setServings] = useState(() => Math.min(20, Math.max(1, initialServings)));
  return <ServingsContext value={{ servings, setServings }}>{children}</ServingsContext>;
}

export function useServings() {
  const value = use(ServingsContext);
  if (!value) throw new Error("ServingsProvider missing");
  return value;
}

export function ServingsStepper() {
  const { servings, setServings } = useServings();
  return (
    <div role="group" aria-label="Porciones" className="flex h-[46px] items-center rounded-full border border-line">
      <button type="button" aria-label="Menos porciones" disabled={servings <= 1} onClick={() => setServings(servings - 1)} className="flex size-11 items-center justify-center disabled:text-ink-faint">
        <Icon name="minus" size={17} />
      </button>
      <span aria-live="polite" className="min-w-16 text-center font-display text-[14px] tabular">Para {servings}</span>
      <button type="button" aria-label="Más porciones" disabled={servings >= 20} onClick={() => setServings(servings + 1)} className="flex size-11 items-center justify-center disabled:text-ink-faint">
        <Icon name="add" size={17} />
      </button>
    </div>
  );
}

export function RecipeBottomBar({ cookHref }: { cookHref: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (cookHref) router.prefetch(cookHref);
  }, [cookHref, router]);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-xl items-center justify-between gap-3 border-t border-line bg-canvas px-5 pt-3 pb-safe">
      <ServingsStepper />
      {cookHref ? <Button size="md" onPress={() => router.push(cookHref)} className="h-[46px] flex-1 bg-ink text-white shadow-none">Cocinar</Button> : null}
    </div>
  );
}
