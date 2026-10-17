"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";
import { DrawablyButton } from "./drawably";

const sizes = {
  lg: "h-14 px-8 text-[17px]",
  md: "h-12 px-6 text-[15px]",
  sm: "h-9 px-4 text-sm",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  /** primary: hand-drawn solid red · secondary: hand-drawn outline · ghost: plain text */
  variant?: "primary" | "secondary" | "ghost";
  size?: keyof typeof sizes;
  block?: boolean;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "lg",
  block = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex select-none items-center justify-center gap-2 font-display font-bold",
    sizes[size],
    block && "w-full",
    className,
  );

  if (variant === "ghost") {
    return (
      <button
        {...props}
        disabled={disabled || loading}
        className={cn(classes, "text-brand transition-opacity active:opacity-60 disabled:text-ink-faint")}
      >
        {children}
      </button>
    );
  }

  return (
    <DrawablyButton
      {...props}
      variant={variant === "primary" ? "solid" : "outline"}
      state={loading ? "loading" : "idle"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {/* Always wrap: a lone text child makes React rewrite textContent, which wipes drawably's SVG. */}
      <span className="inline-flex items-center gap-2">{children}</span>
    </DrawablyButton>
  );
}
