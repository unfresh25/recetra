import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { recipeImageUrl } from "@/lib/recipes/images";
import { cn } from "@/lib/utils/cn";

export function RecipePhoto({ path, sizes, className, hero = false }: { path: string | null; sizes: string; className: string; hero?: boolean }) {
  const src = recipeImageUrl(path, hero ? "full" : "thumb");
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {src ? <Image src={src} alt="" fill sizes={sizes} className="object-cover" unoptimized loading={hero ? "eager" : "lazy"} /> : (
        <div className="flex size-full items-center justify-center bg-sunken text-ink-faint"><Icon name="pot" size={32} /></div>
      )}
    </div>
  );
}
