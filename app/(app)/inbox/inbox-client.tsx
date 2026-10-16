"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { dismissJob, retryImport } from "@/lib/recipes/actions";

/** Refreshes the inbox while imports are still running. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [active, router]);
  return null;
}

export function JobActions({ jobId, canRetry }: { jobId: string; canRetry: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      {canRetry ? (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => startTransition(() => retryImport(jobId))}>
          Reintentar
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => dismissJob(jobId))}>
        Descartar
      </Button>
    </div>
  );
}
