"use client";

import { cn } from "@/lib/utils/cn";
import type { ComponentProps, ReactNode } from "react";

/** Selectable chip, BitePal style: white pill with a red dot when selected. */
export function Chip({
  selected,
  leading,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { selected: boolean; leading?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border bg-surface px-4 text-[15px] font-medium",
        "transition-[transform,border-color,background-color] duration-200 ease-spring active:scale-95",
        selected ? "border-brand bg-brand-soft/60 text-ink" : "border-transparent text-ink shadow-card",
        className,
      )}
    >
      {leading}
      {children}
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full transition-transform duration-200 ease-spring",
          selected ? "scale-100 bg-brand" : "scale-0",
        )}
      />
    </button>
  );
}
