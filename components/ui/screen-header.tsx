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
    <header className="flex flex-col gap-2 px-5 pt-safe">
      {backHref ? (
        <Link href={backHref} aria-label="Volver" className="-ml-2 mt-1 flex size-11 items-center justify-center text-ink">
          <Icon name="arrow-left" size={26} />
        </Link>
      ) : null}
      <div className={backHref ? undefined : "pt-4"}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-condensed text-[44px] font-extrabold leading-[0.95] tracking-tight">{title}</h1>
          {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
        </div>
        {subtitle ? <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p> : null}
      </div>
    </header>
  );
}
