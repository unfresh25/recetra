import type { Metadata } from "next";
import { Suspense } from "react";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ShoppingTabs } from "@/components/shopping/shopping-tabs";
import { ShoppingHeader } from "@/components/shopping/shopping-header";
import { ShoppingEmpty } from "@/components/shopping/shopping-empty";
import { NearbyStores } from "@/components/stores/nearby-stores";
import { requireReadyMembership } from "@/lib/auth";
import { getNearbyStores } from "@/lib/stores/queries";

export const metadata: Metadata = { title: "Tiendas" };

export default function StoresPage() {
  return <div className="[--focus:var(--color-ink)] [&_:focus-visible]:outline-ink">
    <Suspense fallback={<PanLoaderScreen />}><ShoppingHeader /></Suspense>
    <ShoppingTabs current="stores" />
    <div className="flex flex-col px-5 pb-8"><Suspense fallback={<PanLoaderScreen />}><Stores /></Suspense></div>
  </div>;
}

async function Stores() {
  const { household } = await requireReadyMembership();
  const { stores, branches } = await getNearbyStores(household.id);
  if (!stores.length) return <ShoppingEmpty title="Elige tus supermercados" description="Te mostramos las sucursales más cerca de ti." href="/profile/preferences" action="Elegir tiendas" />;
  return <NearbyStores stores={stores} branches={branches} />;
}
