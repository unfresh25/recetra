import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { recipeImageUrl } from "@/lib/recipes/images";
import { cn } from "@/lib/utils/cn";

export function RecipeThumb({ path, size = 72, className }: { path: string | null; size?: number; className?: string }) {
  const src = recipeImageUrl(path, "thumb");
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-2xl bg-sunken", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" unoptimized />
      ) : (
        <span aria-hidden className="flex size-full items-center justify-center text-ink-faint"><Icon name="pot" size={28} /></span>
      )}
    </span>
  );
}
