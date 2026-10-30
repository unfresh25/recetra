"use client";

import { Drawer } from "@heroui/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StoreLogo } from "@/components/ui/store-logo";
import { formatCop } from "@/lib/onboarding/options";
import { pinBrand } from "@/lib/shopping/actions";
import { daysAgo, formatAmount } from "@/lib/shopping/format";
import type { ShoppingItem } from "@/lib/shopping/list";
import type { ShoppingStore } from "@/lib/shopping/queries";

export function ItemDrawer({ item, stores, onClose }: { item: ShoppingItem; stores: ShoppingStore[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const cheapest = item.cheapestStoreId ? item.picks[item.cheapestStoreId] : null;
  const titles = [...new Set(item.sources.map((s) => s.title))];
  const recipes = titles.length > 2 ? `${titles.slice(0, 2).join(", ")} y ${titles.length - 2} más` : titles.join(" y ");
  const amount = formatAmount(item.amount, item.unit);
  return <Drawer.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }} isDismissable={!pending} isKeyboardDismissDisabled={pending} className="[--focus:var(--color-ink)]">
    <Drawer.Content placement="bottom">
      <Drawer.Dialog className="mx-auto w-full max-w-xl border-t border-line bg-canvas px-5 pb-safe text-ink shadow-none [&_button:focus-visible]:outline-ink">
        <Drawer.Handle />
        <Drawer.CloseTrigger isDisabled={pending} aria-label="Cerrar" className="btn-ghost"><Icon name="close" size={20} /></Drawer.CloseTrigger>
        <Drawer.Header>
          <Drawer.Heading className="pr-8 font-display text-[24px]">{item.name}</Drawer.Heading>
          <p className="text-[13px] text-ink-muted">{amount ? `Necesitas ${amount}${recipes ? ` · para ${recipes}` : ""}` : recipes ? `Para ${recipes}` : null}</p>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-0 divide-y divide-line">
          {stores.map((store) => {
            const pick = item.picks[store.id];
            const age = pick ? Math.max(0, daysAgo(pick.offer.capturedAt)) : 0;
            return <div key={store.id} className="flex items-center gap-3 py-4">
              <StoreLogo store={store} size={26} />
              <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{pick ? pick.offer.name : `Sin ${item.pinnedBrand ? `${item.pinnedBrand} en ` : ""}${store.name}`}</p>{pick ? <p className="mt-1 text-[12px] text-ink-muted">{age === 0 ? "Precio de hoy" : `Precio de hace ${age} ${age === 1 ? "día" : "días"}`}</p> : null}</div>
              <div className="shrink-0 text-right"><p className="font-display text-[18px] tabular">{pick ? formatCop(pick.costCop) : <span className="font-sans text-xs text-ink-faint">Sin precio</span>}</p>{pick && store.id === item.cheapestStoreId ? <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-savings">Más barato <Icon name="check" size={14} /></p> : null}</div>
            </div>;
          })}
        </Drawer.Body>
        {item.pinnedBrand || cheapest?.offer.brand ? <Drawer.Footer className="flex flex-col gap-2">
          {error ? <p role="alert" className="text-sm text-warning">{error}</p> : null}
          <Button variant="secondary" block loading={pending} onPress={() => {
            setError(undefined);
            startTransition(async () => {
              try {
                const result = await pinBrand(item.ingredientId, item.pinnedBrand ? null : cheapest!.offer.brand);
                if (result.error) setError(result.error);
              } catch {
                setError("No pudimos guardar la marca. Intenta de nuevo.");
              }
            });
          }}>{item.pinnedBrand ? `Quitar marca fija (${item.pinnedBrand})` : `Comprar siempre ${cheapest!.offer.brand}`}</Button>
        </Drawer.Footer> : null}
      </Drawer.Dialog>
    </Drawer.Content>
  </Drawer.Backdrop>;
}
