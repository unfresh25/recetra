import { cn } from "@/lib/utils/cn";
import type { ComponentProps } from "react";

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string; error?: string }) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        id={inputId}
        {...props}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-14 rounded-field border border-transparent bg-surface px-5 text-[17px] shadow-card outline-none",
          "placeholder:text-ink-faint focus:border-brand",
          error && "border-brand",
          className,
        )}
      />
      {error ? (
        <span className="text-sm text-brand">{error}</span>
      ) : hint ? (
        <span className="text-sm text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}
