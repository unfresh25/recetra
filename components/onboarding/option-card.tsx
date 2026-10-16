"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Selectable tile for the setup grids (stores, styles, allergies...). */
export function OptionCard({
  selected,
  onToggle,
  emoji,
  media,
  label,
  description,
  disabled,
  className,
}: {
  selected: boolean;
  onToggle: () => void;
  emoji?: string;
  media?: ReactNode;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled && !selected}
      onClick={onToggle}
      className={cn(
        "relative flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-card border-2 bg-surface px-3 py-4 text-center",
        "transition-[transform,border-color,opacity] duration-200 ease-spring active:scale-[0.97] disabled:opacity-45",
        selected ? "border-brand" : "border-transparent shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute right-3 top-3 size-2.5 rounded-full bg-brand transition-transform duration-200 ease-spring",
          selected ? "scale-100" : "scale-0",
        )}
      />
      {media ?? (emoji ? <span aria-hidden className="text-[28px] leading-none">{emoji}</span> : null)}
      <span className="font-display text-[15px] font-bold leading-tight">{label}</span>
      {description ? <span className="text-[13px] leading-snug text-ink-muted">{description}</span> : null}
    </button>
  );
}
