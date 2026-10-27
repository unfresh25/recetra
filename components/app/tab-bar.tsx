"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { activeTabForPath } from "@/lib/navigation/active-tab";
import { cn } from "@/lib/utils/cn";
import { CreateSheet } from "./create-sheet";

const tabs: { href: string | null; label: string; icon: IconName }[] = [
  { href: "/discover", label: "Descubre", icon: "compass" },
  { href: "/search", label: "Buscar", icon: "search" },
  { href: null, label: "Crear", icon: "add" },
  { href: "/plan", label: "Plan", icon: "calendar" },
  { href: "/profile", label: "Perfil", icon: "user" },
];

export function TabBar({ avatarUrl }: { avatarUrl?: string | null }) {
  const pathname = usePathname();
  const activeTab = activeTabForPath(pathname);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl border-t border-line bg-canvas px-2 pb-safe"
    >
      <ul className="grid grid-cols-5 items-center pt-1">
        {tabs.map((tab) => {
          if (!tab.href) {
            return <li key="create" className="flex items-center justify-center"><CreateSheet /></li>;
          }
          const active = activeTab === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "btn-ghost flex h-14 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-semibold",
                  active ? "text-ink" : "text-ink-muted",
                )}
              >
                {tab.href === "/profile" && avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className={cn("size-6 rounded-full object-cover", active && "outline-[1.5px] outline-offset-2 outline-ink")}
                  />
                ) : (
                  <Icon name={tab.icon} size={24} strokeWidth={active ? 2.2 : 1.8} />
                )}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
