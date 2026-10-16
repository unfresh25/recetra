import { cn } from "@/lib/utils/cn";
import type { ComponentProps } from "react";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("rounded-card bg-surface p-5 shadow-card", className)} />;
}
