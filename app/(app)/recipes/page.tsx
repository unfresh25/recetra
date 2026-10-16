import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ScreenHeader } from "@/components/ui/screen-header";

export const metadata: Metadata = { title: "Recetas" };

export default function RecipesPage() {
  return (
    <>
      <ScreenHeader title="Recetas" />
      <EmptyState illustration="empty-recipes" title="Aún no hay recetas" description="Pronto podrás importar recetas desde TikTok, Instagram o YouTube." />
    </>
  );
}
