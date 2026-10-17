import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Compras has two views: the list and the stores around you. */
export function ShoppingTabs({ current }: { current: "list" | "stores" }) {
  return (
    <nav className="grid grid-cols-2 px-5" aria-label="Secciones de compras">
      {(
        [
          ["list", "/shopping", "Lista"],
          ["stores", "/shopping/stores", "Tiendas"],
        ] as const
      ).map(([value, href, label]) => (
        <Link
          key={value}
          href={href}
          aria-current={current === value ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center text-[15px] font-semibold",
            current === value ? "text-brand underline decoration-2 underline-offset-8" : "text-ink-muted",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
