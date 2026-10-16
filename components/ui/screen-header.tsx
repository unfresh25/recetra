import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export function ScreenHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 px-5 pt-safe">
      <div className="flex h-11 items-center justify-between">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Volver"
            className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card"
          >
            <Icon name="arrow-left" className="text-brand" />
          </Link>
        ) : (
          <span />
        )}
        {action}
      </div>
      <div>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p> : null}
      </div>
    </header>
  );
}
