"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";
import { DrawablyInput } from "./drawably";

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: ComponentProps<"input"> & { label: string; hint?: string; error?: string }) {
  // drawably's `width` is the stroke width, so the HTML width attribute is dropped.
  const { width, ...props } = rest;
  void width;
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink-muted">{label}</span>
      <DrawablyInput
        id={inputId}
        {...props}
        aria-invalid={error ? true : undefined}
        stroke={error ? "var(--color-brand)" : undefined}
        className={cn("h-14 w-full bg-transparent px-4 text-[18px] outline-none placeholder:text-ink-faint", className)}
      />
      {error ? (
        <span className="text-sm text-brand">{error}</span>
      ) : hint ? (
        <span className="text-sm text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}
