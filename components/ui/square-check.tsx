import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export function SquareCheck({ checked, focusVisible }: { checked: boolean; focusVisible: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150",
        checked ? "border-ink bg-ink" : "border-[#a9a9a9] bg-transparent",
        focusVisible && "outline-2 outline-offset-2 outline-brand",
      )}
    >
      {checked ? <Image src="/icons/Check.svg" alt="" width={14} height={14} /> : null}
    </span>
  );
}
