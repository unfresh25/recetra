import type { Metadata } from "next";
import { Suspense } from "react";
import { ShoppingTabs } from "@/components/shopping/shopping-tabs";
import { NearbyStores } from "@/components/stores/nearby-stores";
import { EmptyState } from "@/components/ui/empty-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { getNearbyStores } from "@/lib/stores/queries";

export const metadata: Metadata = { title: "Tiendas" };

export default function StoresPage() {
  return (
    <>
      <ScreenHeader title="Compras" />
      <ShoppingTabs current="stores" />
      <div className="flex flex-col px-5 pt-4">
        <Suspense fallback={<span className="h-64 animate-pulse rounded-3xl bg-sunken" />}>
          <Stores />
        </Suspense>
      </div>
    </>
  );
}

async function Stores() {
  const { household } = await requireReadyMembership();
  const { stores, branches } = await getNearbyStores(household.id);
  if (!stores.length) {
    return <EmptyState illustration="empty-shopping" title="Elige tus supermercados" description="Te mostramos las sucursales más cerca de ti." />;
  }
  return <NearbyStores stores={stores} branches={branches} />;
}
