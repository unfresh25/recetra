import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { ShoppingTabs } from "@/components/shopping/shopping-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { getShoppingPlan } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Compras" };

export default function ShoppingPage() {
  return (
    <>
      <ScreenHeader title="Compras" />
      <ShoppingTabs current="list" />
      <div className="flex flex-col gap-6 px-5 pt-4">
        <Suspense fallback={<ShoppingSkeleton />}>
          <ShoppingContent />
        </Suspense>
      </div>
    </>
  );
}

function ShoppingSkeleton() {
  return (
    <>
      <span className="h-20 w-56 animate-pulse rounded-2xl bg-sunken" />
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="h-12 animate-pulse rounded-2xl bg-sunken" />
      ))}
    </>
  );
}

async function ShoppingContent() {
  const { household } = await requireReadyMembership();
  const plan = await getShoppingPlan(household.id);

  if (!plan.hasPlan) {
    return (
      <EmptyState
        illustration="empty-shopping"
        title="Aún no hay plan esta semana"
        description="Arma el plan y aquí verás qué comprar y dónde sale más barato."
      />
    );
  }
  if (!plan.stores.length) {
    return (
      <EmptyState
        illustration="empty-shopping"
        title="Elige tus supermercados"
        description={
          plan.unpricedStores.length
            ? `${plan.unpricedStores.join(" y ")} no publica precios en línea. Agrega Éxito, Carulla, Olímpica, D1 o MegaTiendas para comparar.`
            : "Compararemos precios entre las tiendas donde compras."
        }
        action={<Link href="/profile/preferences" className="font-semibold text-brand">Elegir tiendas</Link>}
      />
    );
  }
  if (!plan.items.length) {
    return <EmptyState illustration="empty-shopping" title="Nada por comprar" description="Ya cocinaste todo lo de esta semana." />;
  }

  return <ShoppingList plan={plan} budgetCop={household.weekly_budget_cop} />;
}
