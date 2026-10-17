import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlatformIcon } from "@/components/recipes/platform-icon";
import { RecipeThumb } from "@/components/recipes/recipe-thumb";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import type { ImportPayload, ImportResult } from "@/lib/recipes/import";
import { getInbox } from "@/lib/recipes/queries";
import { parseRecipeUrl } from "@/lib/recipes/source";
import { DraftReview } from "@/components/recipes/draft-review";
import { AutoRefresh, JobActions } from "./inbox-client";

export const metadata: Metadata = { title: "Por confirmar" };

export default function InboxPage() {
  return (
    <>
      <ScreenHeader backHref="/plan" title="Por confirmar" subtitle="Revisa lo que importamos antes de que entre a tu plan." />
      <div className="flex flex-col gap-4 px-5 pt-4">
        <Suspense fallback={<Card className="h-40 animate-pulse" />}>
          <Inbox />
        </Suspense>
      </div>
    </>
  );
}

function jobCopy(status: string, result: ImportResult | null): { title: string; detail: string; failed: boolean } {
  if (status === "failed" || result?.stage === "failed") {
    const reason = result?.stage === "failed" ? result.reason : "unknown";
    const detail = {
      unsupported: "Ese link no es de TikTok, Instagram o YouTube.",
      not_found: "No encontramos el video. ¿Es privado o lo borraron?",
      not_a_recipe: "Ese video no parece ser una receta.",
      low_confidence: "No encontramos la receta completa en el video.",
      ai: "No pudimos entender la receta.",
      unknown: "Algo falló al importar.",
    }[reason];
    return { title: "No pudimos importarla", detail, failed: true };
  }
  if (result?.stage === "needs_worker") {
    return result.reason === "instagram"
      ? { title: "Leyendo Instagram…", detail: "Las recetas de Instagram tardan unos minutos más.", failed: false }
      : { title: "Escuchando el video…", detail: "El texto no traía la receta completa; estamos escuchando el video.", failed: false };
  }
  return { title: "Leyendo la receta…", detail: "Suele tardar menos de un minuto.", failed: false };
}

async function Inbox() {
  const { household } = await requireReadyMembership();
  const { jobs, drafts } = await getInbox(household.id);
  const working = jobs.some((j) => j.status === "queued" || j.status === "running");

  if (!jobs.length && !drafts.length) {
    return (
      <EmptyState
        illustration="empty-recipes"
        title="Todo al día"
        description="Cuando importes una receta, aparecerá aquí para que la revises."
        action={
          <Link href="/recipes/import" className="mt-2 font-semibold text-brand">
            Importar una receta
          </Link>
        }
      />
    );
  }

  return (
    <>
      <AutoRefresh active={working} />
      {jobs.map((job) => {
        const payload = job.payload as unknown as ImportPayload;
        const copy = jobCopy(job.status, job.result as ImportResult | null);
        const platform = parseRecipeUrl(payload.url)?.platform ?? "manual";
        return (
          <Card key={job.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${copy.failed ? "bg-brand-soft text-brand" : "bg-sunken text-ink"}`}
              >
                {copy.failed ? <Icon name="alert" /> : <span className="size-5 animate-spin rounded-full border-2 border-brand border-r-transparent" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold">{copy.title}</p>
                <p className="text-sm text-ink-muted">{copy.detail}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-faint">
                  <PlatformIcon platform={platform} size={12} />
                  <span className="truncate">{payload.url}</span>
                </p>
              </div>
            </div>
            {copy.failed ? <JobActions jobId={job.id} canRetry /> : null}
          </Card>
        );
      })}
      {drafts.map((draft) => (
        <Card key={draft.id} className="flex flex-col gap-4">
          <Link href={`/recipes/${draft.id}`} className="flex items-center gap-3">
            <RecipeThumb path={draft.source_image_path} size={64} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 font-display font-bold leading-snug">{draft.title}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
                <PlatformIcon platform={draft.source_platform} size={13} />
                {draft.author_name ?? "Receta"}
              </span>
              <span className="text-[13px] font-semibold text-brand">Ver ingredientes y pasos</span>
            </span>
          </Link>
          {draft.ai_confidence !== null && draft.ai_confidence < 0.6 ? (
            <p className="flex items-center gap-2 text-sm text-brand">
              Revísala con calma: tuvimos que adivinar parte de la receta.
            </p>
          ) : null}
          <DraftReview recipeId={draft.id} initialMeals={draft.meal_types} />
        </Card>
      ))}
    </>
  );
}
