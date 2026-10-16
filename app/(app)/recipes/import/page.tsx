import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Importar receta" };

export default function ImportPage({ searchParams }: PageProps<"/recipes/import">) {
  return (
    <>
      <ScreenHeader
        backHref="/recipes"
        title="Importar receta"
        subtitle="Pega el link de un video de TikTok, Instagram o YouTube."
      />
      <div className="flex flex-1 flex-col px-5 pt-6">
        <Suspense fallback={<ImportForm />}>
          <SharedUrl searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

/** Android share target sends ?url= or a text containing the link. */
async function SharedUrl({ searchParams }: Pick<PageProps<"/recipes/import">, "searchParams">) {
  const query = await searchParams;
  const raw = [query.url, query.text].flat().find((v) => typeof v === "string" && /https?:\/\//.test(v));
  const url = typeof raw === "string" ? raw.match(/https?:\/\/\S+/)?.[0] : undefined;
  return <ImportForm initialUrl={url} />;
}
