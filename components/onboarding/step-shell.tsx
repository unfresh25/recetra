import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/** BitePal-style setup screen: bare back chevron + thin progress bar, a big question, then content. */
export function StepShell({
  title,
  subtitle,
  progress,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  /** 0..1 */
  progress: number;
  backHref: string | null;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-col gap-6 px-5 pt-safe">
        <div className="flex h-11 items-center gap-3">
          {backHref ? (
            <Link href={backHref} aria-label="Volver" className="-ml-2 flex size-11 shrink-0 items-center justify-center text-ink">
              <Icon name="arrow-left" size={26} />
            </Link>
          ) : (
            <span className="size-9 shrink-0" />
          )}
          <div
            role="progressbar"
            aria-label="Progreso"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-1 flex-1 overflow-hidden rounded-full bg-sunken"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out-soft"
              style={{ width: `${Math.max(6, progress * 100)}%` }}
            />
          </div>
        </div>
        <div>
          <h1 className="font-condensed text-[40px] font-extrabold leading-[0.98] tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-3 text-[16px] text-ink-muted">{subtitle}</p> : null}
        </div>
      </header>
      <div className="flex flex-1 flex-col px-5 pt-6">{children}</div>
    </main>
  );
}
