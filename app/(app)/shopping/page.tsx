import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ScreenHeader } from "@/components/ui/screen-header";

export const metadata: Metadata = { title: "Compras" };

export default function ShoppingPage() {
  return (
    <>
      <ScreenHeader title="Compras" />
      <EmptyState illustration="empty-shopping" title="Tu lista de compras" description="Aquí compararemos precios entre tus supermercados." />
    </>
  );
}
