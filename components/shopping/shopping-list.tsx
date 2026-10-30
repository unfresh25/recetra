"use client";

import { Checkbox, Tabs } from "@heroui/react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { RecipeThumb } from "@/components/recipes/recipe-thumb";
import { Icon } from "@/components/ui/icon";
import { StoreLogo } from "@/components/ui/store-logo";
import { formatCop } from "@/lib/onboarding/options";
import { dayLabel, dayOfMonth } from "@/lib/plan/week";
import { MEAL_TYPE_LABELS, MEAL_TYPES } from "@/lib/recipes/labels";
import { AISLES, formatAmount } from "@/lib/shopping/format";
import type { ShoppingItem, ShoppingSource, StorePick } from "@/lib/shopping/list";
import type { getShoppingPlan, ShoppingStore } from "@/lib/shopping/queries";
import { cn } from "@/lib/utils/cn";
import { useCheckedItems } from "./checked-state";
import { ItemDrawer } from "./item-drawer";

type Plan = Extract<Awaited<ReturnType<typeof getShoppingPlan>>, { hasPlan: true }>;
type View = "aisle" | "store" | "recipe";
type Group = { key: string; title: string; store?: ShoppingStore; source?: ShoppingSource; items: ShoppingItem[] };
const VIEWS = [["aisle", "Por pasillo"], ["store", "Por tienda"], ["recipe", "Por receta"]] as const;
const onlineListeners = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

export function ShoppingList({ plan, budgetCop }: { plan: Plan; budgetCop: number | null }) {
  const stores = useMemo(() => new Map(plan.stores.map((s) => [s.id, s])), [plan.stores]);
  const [mode, setMode] = useState(plan.bestCombo ? "combo" : (plan.bestSingle?.storeIds[0] ?? plan.stores[0]!.id));
  const [view, setView] = useState<View>("aisle");
  const [purchasedOpen, setPurchasedOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { checked, toggle } = useCheckedItems();
  const online = useSyncExternalStore(onlineListeners, () => navigator.onLine, () => true);
  const items = plan.items.filter((i) => !i.staple);
  const staples = plan.items.filter((i) => i.staple);
  const remaining = items.filter((i) => !checked.has(i.ingredientId));
  const purchased = items.filter((i) => checked.has(i.ingredientId));
  // Brand changes can remove the combo. Fall back to the best available single store.
  const activeMode = mode === "combo" && !plan.bestCombo ? plan.bestSingle!.storeIds[0]! : mode;
  const chosen = (item: ShoppingItem): StorePick | null => activeMode === "combo"
    ? (item.picks[plan.bestCombo?.assignment[item.ingredientId] ?? ""] ?? null)
    : (item.picks[activeMode] ?? null);
  const total = activeMode === "combo" ? plan.bestCombo! : plan.perStore.find((t) => t.storeIds[0] === activeMode)!;
  const savings = plan.bestCombo && plan.bestSingle ? plan.bestSingle.totalCop - plan.bestCombo.totalCop : 0;
  const recipeGroups = new Map<string, Group>();
  for (const item of remaining) {
    for (const source of item.sources) {
      const group = recipeGroups.get(source.planMealId) ?? { key: source.planMealId, title: source.title, source, items: [] };
      group.items.push(item);
      recipeGroups.set(source.planMealId, group);
    }
  }
  const groups: Group[] = view === "recipe"
    ? [...recipeGroups.values()].sort((a, b) => a.source!.day.localeCompare(b.source!.day) || MEAL_TYPES.indexOf(a.source!.mealType) - MEAL_TYPES.indexOf(b.source!.mealType))
    : view === "aisle"
      ? AISLES.map((a) => ({ key: a.label, title: a.label, items: remaining.filter((i) => a.categories.includes(i.category)) }))
      : [
          ...total.storeIds.map((id) => ({ key: id, title: stores.get(id)!.name, store: stores.get(id)!, items: remaining.filter((i) => chosen(i)?.offer.storeId === id) })),
          { key: "none", title: "Sin precio", items: remaining.filter((i) => !chosen(i)) },
        ];
  const selectedItem = items.find((i) => i.ingredientId === selectedId);

  function row(item: ShoppingItem, source?: ShoppingSource) {
    return <ShoppingRow key={item.ingredientId} item={item} source={source} recipeView={view === "recipe"} pick={chosen(item)} checked={checked.has(item.ingredientId)} onToggle={() => toggle(item.ingredientId)} onOpen={() => setSelectedId(item.ingredientId)} />;
  }

  return <>
    {!online ? <p role="status" className="flex items-center gap-2 text-sm font-medium text-warning"><Icon name="alert" size={16} /> Sin conexión: ves la última lista guardada. Lo que marques se guarda en el teléfono.</p> : null}
    <section aria-label="Resumen" className="flex flex-col gap-2 rounded-3xl bg-sunken p-[18px]">
      <p className="text-[13px] text-ink-muted">Lo que falta · {remaining.length} productos</p>
      <p className="font-display text-[44px] leading-none tabular">{formatCop(total.totalCop)}</p>
      <p className="text-[14px]">{activeMode === "combo" ? total.storeIds.map((id) => stores.get(id)!.name).join(" + ") : `Todo en ${stores.get(activeMode)!.name}`}</p>
      <div role="progressbar" aria-label="Productos comprados" aria-valuenow={purchased.length} aria-valuemin={0} aria-valuemax={items.length} className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-ink" style={{ width: `${items.length ? purchased.length / items.length * 100 : 0}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px]">
        <span className="text-ink-muted">{purchased.length} de {items.length} comprados</span>
        <span>
          {budgetCop != null ? <span className={total.totalCop <= budgetCop ? "text-savings" : "text-warning"}>{total.totalCop <= budgetCop ? `Te sobran ${formatCop(budgetCop - total.totalCop)}` : `Te pasas ${formatCop(total.totalCop - budgetCop)}`}</span> : null}
          {total.missing ? <span className="text-ink-muted">{budgetCop != null ? " · " : ""}{total.missing} sin precio</span> : null}
        </span>
      </div>
    </section>

    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Dónde comprar">
      {plan.bestCombo ? <ModeOption selected={activeMode === "combo"} onSelect={() => setMode("combo")} total={plan.bestCombo.totalCop} missing={plan.bestCombo.missing}>
        <span className="flex -space-x-1">{plan.bestCombo.storeIds.map((id) => <StoreLogo key={id} store={stores.get(id)!} size={24} />)}</span>
        <span>Combinar</span>
        {savings > 0 ? <span className="rounded-full bg-savings-soft px-2 py-1 text-[11px] text-savings">−{formatCop(savings)}</span> : null}
      </ModeOption> : null}
      {plan.perStore.map((t) => {
        const store = stores.get(t.storeIds[0]!)!;
        return <ModeOption key={store.id} selected={activeMode === store.id} onSelect={() => setMode(store.id)} total={t.totalCop} missing={t.missing}><StoreLogo store={store} size={24} /><span>{store.name}</span></ModeOption>;
      })}
    </div>

    {plan.pending.length ? <Link href="/shopping/review" className="btn-outline flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line p-4 text-[14px]"><span>Revisar {plan.pending.length} {plan.pending.length === 1 ? "producto dudoso" : "productos dudosos"}</span><Icon name="arrow-right" size={18} /></Link> : null}

    <Tabs selectedKey={view} onSelectionChange={(key) => setView(key as View)} className="gap-6">
      <Tabs.ListContainer className="rounded-full bg-sunken p-1">
        <Tabs.List aria-label="Ordenar lista" className="grid w-full grid-cols-3 gap-0 p-0">
          {VIEWS.map(([value, label]) => <Tabs.Tab key={value} id={value} className="h-10 min-w-0 rounded-full px-2 text-[13px] font-medium text-ink-muted data-[selected=true]:bg-white data-[selected=true]:text-ink">{label}</Tabs.Tab>)}
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel id={view} className="mt-0 flex flex-col gap-6 p-0">
        {groups.filter((g) => g.items.length).map((group) => <section key={group.key} aria-labelledby={`shopping-group-${encodeURIComponent(group.key)}`}>
          {group.source ? <div className="mb-2 flex items-center gap-2.5">
            <RecipeThumb path={group.source.coverPath} size={36} className="rounded-full" />
            <div className="min-w-0"><h2 id={`shopping-group-${encodeURIComponent(group.key)}`} className="font-display text-[16px]">{group.title}</h2><p className="text-[12px] text-ink-muted">{dayLabel(group.source.day)} {dayOfMonth(group.source.day)} · {MEAL_TYPE_LABELS[group.source.mealType]}</p></div>
          </div> : <h2 id={`shopping-group-${encodeURIComponent(group.key)}`} className="flex items-center gap-2 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{group.store ? <StoreLogo store={group.store} size={18} /> : null}{group.title}</h2>}
          <ul className="divide-y divide-line">{group.items.map((item) => row(item, group.source ? item.sources.find((s) => s.planMealId === group.source!.planMealId) : undefined))}</ul>
        </section>)}
        {purchased.length ? <section>
          <button type="button" onClick={() => setPurchasedOpen((open) => !open)} aria-expanded={purchasedOpen} aria-controls="purchased-items" className="btn-ghost flex w-full items-center justify-between py-2 text-[14px] font-medium text-ink-muted">Comprados ({purchased.length})<Icon name="arrow-right" size={18} className={purchasedOpen ? "rotate-90" : ""} /></button>
          {purchasedOpen ? <ul id="purchased-items" className="divide-y divide-line">{purchased.map((item) => row(item))}</ul> : null}
        </section> : null}
      </Tabs.Panel>
    </Tabs>

    {plan.unpricedStores.length ? <p className="text-[13px] leading-relaxed text-ink-muted">{plan.unpricedStores.join(" y ")} no {plan.unpricedStores.length > 1 ? "publican" : "publica"} precios en línea, así que no entra en la comparación.</p> : null}
    {staples.length ? <section className="flex flex-col gap-3"><h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Revisa en tu despensa</h2><ul className="flex flex-wrap gap-2">{staples.map((s) => <li key={s.ingredientId} className="rounded-full bg-sunken px-3 py-1.5 text-[12px] text-ink-muted">{s.name}</li>)}</ul></section> : null}
    {selectedItem ? <ItemDrawer item={selectedItem} stores={plan.householdStores} onClose={() => setSelectedId(null)} /> : null}
  </>;
}

function ModeOption({ selected, onSelect, total, missing, children }: { selected: boolean; onSelect: () => void; total: number; missing: number; children: React.ReactNode }) {
  return <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cn("btn-ghost flex shrink-0 flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left", selected ? "border-ink bg-white" : "border-line bg-transparent")}>
    <span className="flex items-center gap-2 whitespace-nowrap text-[14px] font-medium">{children}</span>
    <span className="text-[13px] tabular">{formatCop(total)}{missing ? <span className="text-ink-muted"> · faltan {missing}</span> : null}</span>
  </button>;
}

function ShoppingRow({ item, source, recipeView, pick, checked, onToggle, onOpen }: { item: ShoppingItem; source?: ShoppingSource; recipeView: boolean; pick: StorePick | null; checked: boolean; onToggle: () => void; onOpen: () => void }) {
  const amount = formatAmount(source ? source.amount : item.amount, source?.unit ?? item.unit);
  const otherRecipes = Math.max(0, item.sources.length - 1);
  const detail = recipeView
    ? [amount, otherRecipes > 0 ? `${amount ? "también" : "También"} en ${otherRecipes} ${otherRecipes === 1 ? "receta" : "recetas"}` : null].filter(Boolean).join(" · ")
    : [amount ?? "Al gusto", pick ? `${pick.weightG ? `pide ${formatAmount(pick.weightG, "g")} de ` : pick.packages > 1 ? `${pick.packages} × ` : ""}${pick.offer.name}` : null].filter(Boolean).join(" · ");
  return <li className={cn("flex min-h-[68px] items-center gap-1", checked && "opacity-50")}>
    <Checkbox isSelected={checked} onChange={onToggle} aria-label={`${item.name} comprado`} className="shrink-0">
      <Checkbox.Content aria-label={`${item.name} comprado`} className="flex size-11 items-center justify-center">
        <span className={cn("flex size-6 items-center justify-center rounded-full border", checked ? "border-ink bg-ink text-white" : "border-ink-faint bg-transparent")}>
          {checked ? <Icon name="check" size={16} /> : null}
        </span>
      </Checkbox.Content>
    </Checkbox>
    <button type="button" onClick={onOpen} aria-haspopup="dialog" className="btn-ghost flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15.5px] font-medium", checked && "line-through")}>{item.name}</span>
        {detail ? <span className="block text-[12.5px] leading-relaxed text-ink-muted">{detail}</span> : null}
      </span>
      {!recipeView ? <span className={cn("shrink-0 font-display text-[17px] tabular", !pick && "font-sans text-[12px] text-ink-faint")}>{pick ? formatCop(pick.costCop) : "Sin precio"}</span> : null}
    </button>
  </li>;
}
