import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** Flat grouping: no background, border or shadow. Use dividers between groups when needed. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("py-2", className)} />;
}
