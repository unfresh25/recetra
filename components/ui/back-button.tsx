"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/** Goes back in history when there is somewhere to go; otherwise to `fallback` (e.g. a page opened from a link). */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Volver"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className={cn("flex size-11 items-center justify-center", className)}
    >
      <Image src="/icons/Frame.svg" alt="" width={22} height={22} />
    </button>
  );
}
