"use client";

import { FieldError, Input, Label, TextField } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = Omit<ComponentProps<typeof Input>, "className" | "value" | "onChange" | "size" | "name">;

/**
 * Mise's text field: an optional quiet label over just the text, no border, background or ring.
 * The green caret is the only affordance.
 */
export function BareField({
  label,
  name,
  value,
  onChange,
  error,
  end,
  size = "md",
  isRequired,
  autoFocus,
  className,
  ...inputProps
}: InputProps & {
  /** Visible label; when omitted pass `aria-label`. */
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Trailing control, e.g. a clear button. */
  end?: ReactNode;
  /** md: 24px form fields · lg: 26px single-answer screens. */
  size?: "md" | "lg";
  isRequired?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      autoFocus={autoFocus}
      aria-label={inputProps["aria-label"]}
      fullWidth
      className={cn("flex flex-col gap-2.5", className)}
    >
      {label ? <Label className="font-display text-[16px] leading-5 font-normal text-[#8f8f8f]">{label}</Label> : null}
      <div className="flex items-center gap-3">
        <Input
          {...inputProps}
          className={cn(
            "min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 font-display text-ink caret-brand shadow-none outline-none placeholder:text-ink-faint/70",
            "hover:bg-transparent focus:bg-transparent focus:ring-0 data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent data-[invalid=true]:bg-transparent data-[invalid=true]:outline-none",
            size === "lg" ? "text-[26px] leading-8" : "text-[24px] leading-[30px]",
          )}
        />
        {end}
      </div>
      <FieldError className="font-sans text-sm text-danger">{error}</FieldError>
    </TextField>
  );
}
