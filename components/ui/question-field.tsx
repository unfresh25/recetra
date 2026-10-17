import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** BitePal-style question: a quiet centered prompt over a large borderless answer. */
export function QuestionField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string; error?: string }) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex flex-col items-center gap-3 text-center">
      <span className="text-[15px] font-semibold text-ink-muted">{label}</span>
      <input
        id={inputId}
        {...props}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full bg-transparent text-center font-display text-[32px] font-extrabold leading-tight text-ink caret-brand outline-none placeholder:text-ink-faint/60",
          className,
        )}
      />
      {error ? (
        <span className="text-sm text-brand">{error}</span>
      ) : hint ? (
        <span className="max-w-72 text-sm text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}
