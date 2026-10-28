"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { DrawablyButton } from "./drawably";

/** Hand-drawn toggle chip: sketched outline, solid red when selected. */
export function Chip({
  selected,
  leading,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { selected: boolean; leading?: ReactNode }) {
  return (
    <DrawablyButton
      type="button"
      aria-pressed={selected}
      {...props}
      variant={selected ? "solid" : "outline"}
      tone={selected ? undefined : "neutral"}
      className={cn("btn-outline inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium", className)}
    >
      <span className="inline-flex items-center gap-1.5">
        {leading}
        {children}
      </span>
    </DrawablyButton>
  );
}
