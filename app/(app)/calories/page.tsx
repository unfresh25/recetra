import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ScreenHeader } from "@/components/ui/screen-header";

export const metadata: Metadata = { title: "Calorías" };

export default function CaloriesPage() {
  return (
    <>
      <ScreenHeader title="Calorías" />
      <EmptyState illustration="empty-calories" title="Registro de calorías" description="Pronto podrás registrar tus comidas con una foto." />
    </>
  );
}
