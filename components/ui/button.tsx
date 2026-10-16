import { cn } from "@/lib/utils/cn";
import type { ComponentProps } from "react";

const variants = {
  primary:
    "bg-brand text-white shadow-[0_6px_20px_rgb(232_32_42/0.28)] hover:bg-brand-press disabled:bg-brand/35 disabled:shadow-none",
  secondary: "bg-surface text-ink shadow-card hover:bg-sunken disabled:text-ink-faint",
  ghost: "bg-transparent text-brand hover:bg-brand-soft disabled:text-ink-faint",
} as const;

const sizes = {
  lg: "h-14 px-7 text-[17px]",
  md: "h-12 px-5 text-[15px]",
  sm: "h-9 px-4 text-sm",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
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
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-display font-bold",
        "transition-[transform,background-color,box-shadow] duration-150 ease-out-soft active:scale-[0.97] disabled:active:scale-100",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
    >
      {loading ? (
        <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
