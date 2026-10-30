import type { Metadata } from "next";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { ShoppingTabs } from "@/components/shopping/shopping-tabs";
import { ShoppingHeader } from "@/components/shopping/shopping-header";
import { ShoppingOptions } from "@/components/shopping/shopping-options";
import { ShoppingEmpty } from "@/components/shopping/shopping-empty";
import { requireReadyMembership } from "@/lib/auth";
import { getShoppingPlan } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Compras" };

export default function ShoppingPage() {
  return <div className="[--focus:var(--color-ink)] [&_:focus-visible]:outline-ink"><Suspense fallback={<PanLoaderScreen />}><ShoppingContent /></Suspense></div>;
}

async function ShoppingContent() {
  const { household } = await requireReadyMembership();
  const plan = await getShoppingPlan(household.id);
  let content;
  if (!plan.hasPlan) {
    content = <ShoppingEmpty title="Tu semana está en blanco" description="Agrega recetas al plan y aquí verás qué comprar y dónde sale más barato." href="/plan" action="Ir al plan" />;
  } else if (!plan.stores.length) {
    content = <ShoppingEmpty title="Elige tus supermercados" description={plan.unpricedStores.length ? `${plan.unpricedStores.join(" y ")} no publica precios en línea. Agrega Éxito, Carulla, Olímpica, D1 o MegaTiendas para comparar.` : "Compararemos precios entre las tiendas donde compras."} href="/profile/preferences" action="Elegir tiendas" />;
  } else if (!plan.items.length) {
    content = <ShoppingEmpty title="Nada por comprar" description="Ya cocinaste todo lo de esta semana." />;
  } else {
    content = <ShoppingList plan={plan} budgetCop={household.weekly_budget_cop} />;
  }
  return <>
    <ShoppingHeader action={plan.hasPlan && plan.stores.length > 0 && plan.items.length > 0 ? <ShoppingOptions itemIds={plan.items.filter((i) => !i.staple).map((i) => i.ingredientId)} /> : null} />
    <ShoppingTabs current="list" />
    <div className="flex flex-col gap-6 px-5 pb-8">{content}</div>
  </>;
}
