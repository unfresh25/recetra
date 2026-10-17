"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { DrawablyCheckbox } from "@/components/ui/drawably";
import { Icon } from "@/components/ui/icon";
import { StoreLogo } from "@/components/ui/store-logo";
import { formatCop } from "@/lib/onboarding/options";
import { pinBrand } from "@/lib/shopping/actions";
import { AISLES, daysAgo, formatAmount } from "@/lib/shopping/format";
import type { ShoppingItem, StorePick } from "@/lib/shopping/list";
import type { getShoppingPlan, ShoppingStore } from "@/lib/shopping/queries";
import { cn } from "@/lib/utils/cn";

type Plan = Extract<Awaited<ReturnType<typeof getShoppingPlan>>, { hasPlan: true }>;
type Mode = "combo" | string;

// Checked items live on the device: a shopping trip is personal and works without signal.
const CHECKED_KEY = "recetra:shopping-checked";
const listeners = new Set<() => void>();
function readChecked(): string {
  return typeof window === "undefined" ? "[]" : (localStorage.getItem(CHECKED_KEY) ?? "[]");
}
function writeChecked(ids: string[]) {
  localStorage.setItem(CHECKED_KEY, JSON.stringify(ids));
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ShoppingList({ plan, budgetCop }: { plan: Plan; budgetCop: number | null }) {
  const stores = useMemo(() => new Map(plan.stores.map((s) => [s.id, s])), [plan.stores]);
  const [mode, setMode] = useState<Mode>(plan.bestCombo ? "combo" : (plan.bestSingle?.storeIds[0] ?? plan.stores[0]!.id));
  const [view, setView] = useState<"aisle" | "store">("aisle");
  const checkedRaw = useSyncExternalStore(subscribe, readChecked, () => "[]");
  const checked = useMemo(() => new Set<string>(JSON.parse(checkedRaw)), [checkedRaw]);

  const priced = plan.items.filter((i) => !i.staple);
  const staples = plan.items.filter((i) => i.staple);
  const chosen = (item: ShoppingItem): StorePick | null =>
    mode === "combo" ? (item.picks[plan.bestCombo?.assignment[item.ingredientId] ?? ""] ?? null) : (item.picks[mode] ?? null);
  const total = mode === "combo" ? plan.bestCombo! : plan.perStore.find((t) => t.storeIds[0] === mode)!;
  const savings = plan.bestCombo && plan.bestSingle ? plan.bestSingle.totalCop - plan.bestCombo.totalCop : 0;

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeChecked([...next]);
  }

  const groups =
    view === "aisle"
      ? AISLES.map((a) => ({ key: a.label, title: a.label, store: null as ShoppingStore | null, items: priced.filter((i) => a.categories.includes(i.category)) }))
      : [
          ...total.storeIds.map((id) => ({ key: id, title: stores.get(id)!.name, store: stores.get(id)!, items: priced.filter((i) => chosen(i)?.offer.storeId === id) })),
          { key: "none", title: "Sin precio", store: null, items: priced.filter((i) => !chosen(i)) },
        ];

  return (
    <>
      <section aria-label="Resumen" className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">
          Lo que falta esta semana · {priced.length} productos
        </p>
        <p className="font-condensed text-[56px] font-extrabold leading-none tracking-tight tabular">{formatCop(total.totalCop)}</p>
        <p className="font-display text-lg font-bold">
          {mode === "combo" ? total.storeIds.map((id) => stores.get(id)!.name).join(" + ") : `Todo en ${stores.get(mode)!.name}`}
        </p>
        <div className="flex flex-wrap gap-x-3 text-sm">
          {budgetCop ? (
            total.totalCop <= budgetCop ? (
              <span className="text-savings">Te sobran {formatCop(budgetCop - total.totalCop)} del presupuesto</span>
            ) : (
              <span className="text-warning">Te pasas {formatCop(total.totalCop - budgetCop)} del presupuesto</span>
            )
          ) : null}
          {total.missing ? <span className="text-ink-muted">{total.missing} sin precio</span> : null}
        </div>
      </section>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Dónde comprar">
        {plan.bestCombo ? (
          <ModeOption selected={mode === "combo"} onSelect={() => setMode("combo")} total={plan.bestCombo.totalCop} missing={plan.bestCombo.missing}>
            <span className="flex -space-x-2">
              {plan.bestCombo.storeIds.map((id) => <StoreLogo key={id} store={stores.get(id)!} size={24} />)}
            </span>
            <span className="font-semibold">Combinar</span>
            {savings > 0 ? <span className="rounded-full bg-savings-soft px-2 text-xs font-bold text-savings">−{formatCop(savings)}</span> : null}
          </ModeOption>
        ) : null}
        {plan.perStore.map((t) => {
          const store = stores.get(t.storeIds[0]!)!;
          return (
            <ModeOption key={store.id} selected={mode === store.id} onSelect={() => setMode(store.id)} total={t.totalCop} missing={t.missing}>
              <StoreLogo store={store} size={24} />
              <span className="font-semibold">{store.name}</span>
            </ModeOption>
          );
        })}
      </div>

      <nav className="grid grid-cols-2" aria-label="Ordenar lista">
        {(
          [
            ["aisle", "Por pasillo"],
            ["store", "Por tienda"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={cn("h-11 text-[15px] font-semibold", view === value ? "text-brand underline decoration-2 underline-offset-8" : "text-ink-muted")}
          >
            {label}
          </button>
        ))}
      </nav>

      {groups
        .filter((g) => g.items.length)
        .map((group) => (
          <section key={group.key} className="flex flex-col">
            <h2 className="flex items-center gap-2 pb-1 text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
              {group.store ? <StoreLogo store={group.store} size={18} /> : null}
              {group.title}
            </h2>
            <ul className="divide-y divide-line">
              {group.items.map((item) => (
                <Row key={item.ingredientId} item={item} pick={chosen(item)} stores={plan.stores} checked={checked.has(item.ingredientId)} onToggle={() => toggle(item.ingredientId)} />
              ))}
            </ul>
          </section>
        ))}

      {plan.unpricedStores.length ? (
        <p className="text-sm text-ink-muted">
          {plan.unpricedStores.join(" y ")} no {plan.unpricedStores.length > 1 ? "publican" : "publica"} precios en línea, así que no entra en la comparación.
        </p>
      ) : null}

      {staples.length ? (
        <section className="flex flex-col gap-2 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Revisa en tu despensa</h2>
          <p className="text-[15px] text-ink-muted">{staples.map((s) => s.name).join(" · ")}</p>
        </section>
      ) : null}
    </>
  );
}

function ModeOption({
  selected,
  onSelect,
  total,
  missing,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  total: number;
  missing: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn("flex shrink-0 flex-col items-start gap-1 rounded-2xl px-4 py-3 text-left", selected ? "bg-surface" : "text-ink-muted")}
    >
      <span className="flex items-center gap-2 text-[15px] text-ink">{children}</span>
      <span className="text-sm tabular">
        {formatCop(total)}
        {missing ? ` · faltan ${missing}` : ""}
      </span>
    </button>
  );
}

function Row({
  item,
  pick,
  stores,
  checked,
  onToggle,
}: {
  item: ShoppingItem;
  pick: StorePick | null;
  stores: ShoppingStore[];
  checked: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const amount = formatAmount(item.amount, item.unit);
  return (
    <li className="flex flex-col">
      <div className="flex min-h-14 items-center gap-3 py-2">
        <DrawablyCheckbox
          checked={checked}
          onChange={onToggle}
          aria-label={`${item.name} comprado`}
          stroke={checked ? "var(--color-brand)" : "var(--color-ink-faint)"}
        />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate font-semibold", checked && "text-ink-faint line-through")}>{item.name}</span>
            <span className="block truncate text-sm text-ink-muted">
              {[amount, pick ? `${pick.packages > 1 ? `${pick.packages} × ` : ""}${pick.offer.name}` : null].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className={cn("shrink-0 text-right font-display font-bold tabular", !pick && "text-sm font-medium text-ink-faint")}>
            {pick ? formatCop(pick.costCop) : "Sin precio"}
          </span>
          <Icon name="arrow-right" size={16} className={cn("shrink-0 text-ink-faint transition-transform", open && "rotate-90")} />
        </button>
      </div>
      {open ? <StoreBreakdown item={item} stores={stores} /> : null}
    </li>
  );
}

function StoreBreakdown({ item, stores }: { item: ShoppingItem; stores: ShoppingStore[] }) {
  const [pending, startTransition] = useTransition();
  const cheapest = item.cheapestStoreId ? item.picks[item.cheapestStoreId] : null;
  return (
    <div className="flex flex-col gap-1 pb-3 pl-10">
      {stores.map((store) => {
        const pick = item.picks[store.id];
        const age = pick ? daysAgo(pick.offer.capturedAt) : 0;
        return (
          <div key={store.id} className="flex items-center gap-3 py-1.5 text-sm">
            <StoreLogo store={store} size={22} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{pick ? pick.offer.name : `Sin ${item.pinnedBrand ? `${item.pinnedBrand} en ` : ""}${store.name}`}</span>
              {pick && age >= 2 ? <span className="block text-xs text-ink-faint">Precio de hace {age} días</span> : null}
            </span>
            {pick ? (
              <span className={cn("flex items-center gap-1 font-semibold tabular", store.id === item.cheapestStoreId && "text-savings")}>
                {store.id === item.cheapestStoreId ? <Icon name="check" size={14} /> : null}
                {formatCop(pick.costCop)}
              </span>
            ) : (
              <span className="text-ink-faint">—</span>
            )}
          </div>
        );
      })}
      {item.pinnedBrand || cheapest?.offer.brand ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await pinBrand(item.ingredientId, item.pinnedBrand ? null : cheapest!.offer.brand)))}
          className="self-start pt-1 text-sm font-semibold text-brand disabled:text-ink-faint"
        >
          {item.pinnedBrand ? `Quitar marca fija (${item.pinnedBrand})` : `Comprar siempre ${cheapest!.offer.brand}`}
        </button>
      ) : null}
    </div>
  );
}
