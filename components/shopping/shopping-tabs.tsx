import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function ShoppingTabs({ current }: { current: "list" | "stores" }) {
  return <nav aria-label="Secciones de compras" className="flex gap-7 px-5 pb-5">
    {([["list", "/shopping", "Lista"], ["stores", "/shopping/stores", "Tiendas"]] as const).map(([value, href, label]) =>
      <Link key={value} href={href} aria-current={current === value ? "page" : undefined} className={cn("link-text font-display text-[26px] leading-tight", current === value ? "text-ink" : "text-ink-faint")}>{label}</Link>,
    )}
  </nav>;
}
