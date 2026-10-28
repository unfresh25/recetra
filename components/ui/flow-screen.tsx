"use client";

import { ProgressBar } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * One step of a flow (login, onboarding): a top bar, a large title, the step's content,
 * and a round next button pinned to the bottom right so long content can scroll under it.
 *
 * The top bar shows back + "Ayuda" in the login flow, and back + a completion bar in onboarding.
 */
export function FlowScreen({
  back,
  progress,
  title,
  subtitle,
  titleAside,
  children,
  action,
  secondaryAction,
}: {
  /** A route, or a handler for in-page steps. */
  back?: string | (() => void);
  /** Onboarding completion, 0–1. Replaces the help link with a progress bar. */
  progress?: number;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Sits to the right of the title, e.g. the photo button. */
  titleAside?: ReactNode;
  children: ReactNode;
  /** Usually a <NextButton />. */
  action?: ReactNode;
  /** Quiet link on the left of the bottom bar. */
  secondaryAction?: ReactNode;
}) {
  const backClass = "btn-ghost -ml-2 flex size-11 shrink-0 items-center justify-center";
  const backIcon = <Image src="/icons/Frame.svg" alt="" width={22} height={22} />;
  const backControl =
    typeof back === "string" ? (
      <Link href={back} aria-label="Volver" className={backClass}>
        {backIcon}
      </Link>
    ) : back ? (
      <button type="button" onClick={back} aria-label="Volver" className={backClass}>
        {backIcon}
      </button>
    ) : null;

  return (
    <div className="flex flex-1 flex-col px-5 pt-safe">
      <header className="flex h-14 items-center justify-between gap-4">
        {backControl ?? (progress === undefined ? <span /> : null)}
        {progress === undefined ? (
          <Link href="/help" className="link-text font-display text-[16px] text-ink">
            Ayuda
          </Link>
        ) : (
          <ProgressBar aria-label="Progreso del registro" value={Math.round(progress * 100)} className="flex-1">
            <ProgressBar.Track className="h-[5px] rounded-full bg-[#e2dfda]">
              <ProgressBar.Fill className="rounded-full bg-ink transition-[width] duration-500 ease-out-soft" />
            </ProgressBar.Track>
          </ProgressBar>
        )}
      </header>

      <div className="mt-10 flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] leading-10 tracking-tight text-balance">{title}</h1>
          {subtitle ? <p className="mt-2 text-[16px] leading-snug text-pretty text-[#8f8f8f]">{subtitle}</p> : null}
        </div>
        {titleAside}
      </div>

      <div className="mt-12 flex flex-1 flex-col">{children}</div>

      {action || secondaryAction ? (
        <div className="sticky bottom-0 flex items-center justify-between gap-4 bg-canvas pt-4 pb-[max(env(safe-area-inset-bottom),3.25rem)]">
          <div className="min-w-0">{secondaryAction}</div>
          {action}
        </div>
      ) : null}
    </div>
  );
}
