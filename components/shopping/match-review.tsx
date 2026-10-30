"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { StoreLogo } from "@/components/ui/store-logo";
import { formatCop } from "@/lib/onboarding/options";
import { reviewMatch } from "@/lib/shopping/actions";
import { formatAmount } from "@/lib/shopping/format";
import type { PendingMatch, ShoppingStore } from "@/lib/shopping/queries";

export function MatchReview({ pending, stores }: { pending: PendingMatch[]; stores: ShoppingStore[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const byId = new Map(stores.map((s) => [s.id, s]));
  const left = pending.filter((p) => !done.has(p.matchId));

  function answer(matchId: string, approve: boolean) {
    setDone((d) => new Set(d).add(matchId));
    startTransition(async () => {
      const result = await reviewMatch(matchId, approve);
      if (result.error) {
        setError(result.error);
        setDone((d) => {
          const next = new Set(d);
          next.delete(matchId);
          return next;
        });
      }
    });
  }

  return (
    <div className="flex flex-col">
      <p className="pb-2 text-sm text-ink-muted">{left.length} por revisar</p>
      {error ? <p role="alert" className="pb-2 text-sm text-warning">{error}</p> : null}
      {!left.length ? <p role="status" className="py-6 text-center font-display text-2xl">Todo revisado</p> : null}
      <ul className="flex flex-col gap-3">
        {left.map((p) => {
          const store = byId.get(p.offer.storeId);
          return (
            <li key={p.matchId} className="flex flex-col gap-3 rounded-[20px] bg-sunken p-4">
              <p className="flex items-center gap-2 font-display text-[18px]">{p.ingredientName}<Icon name="arrow-right" size={16} className="text-ink-muted" /></p>
              <div className="flex items-center gap-3">
                {store ? <StoreLogo store={store} size={32} /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.offer.name}</span>
                  <span className="block text-sm text-ink-muted tabular">
                    {formatAmount(p.offer.packageQty, p.offer.packageUnit)} · {formatCop(p.offer.priceCop)}
                  </span>
                </span>
              </div>
              <div className="flex gap-3">
                <Button size="md" variant="primary" onPress={() => answer(p.matchId, true)}>
                  Sí, es ese
                </Button>
                <Button size="md" variant="secondary" onPress={() => answer(p.matchId, false)}>
                  No
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
