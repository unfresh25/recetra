"use client";

import { Button as HeroButton, Spinner } from "@heroui/react";
import Image from "next/image";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

/** The round ink "continue" button that closes every flow step. */
export function NextButton({
  loading = false,
  done = false,
  className,
  ...props
}: Omit<ComponentProps<typeof HeroButton>, "children" | "isIconOnly" | "isPending"> & {
  loading?: boolean;
  /** Last step: a check instead of an arrow. */
  done?: boolean;
}) {
  return (
    <HeroButton
      {...props}
      isIconOnly
      isPending={loading}
      aria-label={props["aria-label"] ?? (done ? "Terminar" : "Continuar")}
      className={cn("size-15 rounded-full bg-ink text-white data-[disabled=true]:opacity-30", className)}
    >
      {loading ? (
        <Spinner color="current" size="sm" />
      ) : (
        <Image src={done ? "/icons/Check.svg" : "/icons/Arrow.svg"} alt="" width={30} height={30} />
      )}
    </HeroButton>
  );
}
