import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export const illustrations = {
  "welcome-plan": "Bowl con arroz, aguacate, huevo y patacón",
  "welcome-shopping": "Bolsa de mercado con frutas, verduras y monedas",
  "empty-plan": "Calendario con cubiertos",
  "empty-recipes": "Cuaderno de recetas y celular con video",
  "empty-shopping": "Canasta de mercado",
  "empty-calories": "Plato balanceado con una llama",
  invite: "Sobre con sello de corazón y una llave",
} as const;

export type IllustrationName = keyof typeof illustrations;

export function Illustration({
  name,
  size = 160,
  preload = false,
  className,
}: {
  name: IllustrationName;
  size?: number;
  preload?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`/illustrations/${name}.webp`}
      alt={illustrations[name]}
      width={size}
      height={size}
      preload={preload}
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}
