"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/plan", label: "Plan", icon: "calendar" },
  { href: "/recipes", label: "Recetas", icon: "restaurant" },
  { href: "/shopping", label: "Compras", icon: "basket" },
  { href: "/calories", label: "Calorías", icon: "fire" },
  { href: "/profile", label: "Perfil", icon: "user" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-safe"
    >
      <ul className="flex items-center justify-between rounded-full bg-surface/90 p-1.5 shadow-float backdrop-blur-xl">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors duration-200",
                  active ? "bg-brand-soft text-brand" : "text-ink-muted",
                )}
              >
                <Icon name={tab.icon} size={22} strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
