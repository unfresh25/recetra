import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

/** Full-screen single-question layout: back control, then content in the upper third so the keyboard never covers it. */
export function QuestionScreen({
  back,
  compact = false,
  children,
}: {
  /** A route, or a handler for in-page steps. */
  back?: string | (() => void);
  /** Less top space, for screens that lead with an illustration. */
  compact?: boolean;
  children: ReactNode;
}) {
  const className = "btn-ghost -ml-2 flex size-11 items-center justify-center text-ink";
  return (
    <main className="flex flex-1 flex-col px-5 pt-safe">
      <div className="h-11">
        {typeof back === "string" ? (
          <Link href={back} aria-label="Volver" className={className}>
            <Icon name="arrow-left" size={26} />
          </Link>
        ) : back ? (
          <button type="button" onClick={back} aria-label="Volver" className={className}>
            <Icon name="arrow-left" size={26} />
          </button>
        ) : null}
      </div>
      <div className={`flex flex-1 flex-col items-center ${compact ? "pt-[3vh]" : "pt-[14vh]"}`}>{children}</div>
    </main>
  );
}
