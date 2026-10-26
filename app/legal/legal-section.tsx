import type { ReactNode } from "react";

/** One numbered clause: heading, a one-line plain-language summary, then the full text. */
export function LegalSection({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2>{title}</h2>
      <p className="text-[15px] leading-snug text-ink-muted">En resumen: {summary}</p>
      {children}
    </section>
  );
}
