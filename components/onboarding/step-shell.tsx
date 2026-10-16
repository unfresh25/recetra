import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/** Recipy-style setup screen: back button + progress bar, big question, then content. */
export function StepShell({
  title,
  subtitle,
  progress,
  backHref,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  /** 0..1 */
  progress: number;
  backHref: string | null;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-col gap-5 px-5 pt-safe">
        <div className="flex h-11 items-center gap-4">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Volver"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-card"
            >
              <Icon name="arrow-left" className="text-brand" />
            </Link>
          ) : (
            <span className="size-11 shrink-0" />
          )}
          <div
            role="progressbar"
            aria-label="Progreso"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out-soft"
              style={{ width: `${Math.max(6, progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[30px] font-extrabold leading-[1.08] tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p> : null}
          </div>
          {aside}
        </div>
      </header>
      <div className="flex flex-1 flex-col px-5 pt-6">{children}</div>
    </main>
  );
}
