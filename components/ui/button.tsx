"use client";

import { Button as HeroButton, Spinner } from "@heroui/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

const sizes = {
  lg: "h-14 px-8 text-[17px]",
  md: "h-12 px-6 text-[15px]",
  sm: "h-9 px-4 text-sm",
} as const;

const variants = {
  primary: "primary",
  secondary: "outline",
  ghost: "ghost",
} as const;

export type ButtonProps = Omit<ComponentProps<typeof HeroButton>, "variant" | "size" | "isDisabled" | "isPending"> & {
  /** primary: solid ink · secondary: outlined · ghost: plain text */
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  variant = "primary",
  size = "lg",
  block = false,
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <HeroButton
      {...props}
      variant={variants[variant]}
      fullWidth={block}
      isDisabled={disabled}
      isPending={loading}
      aria-busy={loading || undefined}
      className={cn("rounded-full font-display", sizes[size], className)}
    >
      {(state) => (
        <>
          {loading ? <Spinner color="current" size="sm" /> : null}
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </HeroButton>
  );
}
