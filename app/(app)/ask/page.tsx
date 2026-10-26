import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ui/screen-header";

export const metadata: Metadata = { title: "Preguntar" };

export default function AskPage() {
  return (
    <>
      <ScreenHeader title="Preguntar" backHref="/discover" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
        <h2 className="max-w-sm font-display text-2xl font-bold">Muy pronto podrás preguntarle a Carmy</h2>
        <p className="max-w-sm text-[15px] text-ink-muted">Qué cocinar con lo que tienes, cómo reemplazar un ingrediente o cuánto rinde una receta.</p>
      </div>
    </>
  );
}
