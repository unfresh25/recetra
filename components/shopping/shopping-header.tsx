import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { addDays, dayOfMonth, mondayOf, todayInBogota } from "@/lib/plan/week";

export async function ShoppingHeader({ title = "Compras", subtitle, backHref = "/plan", action }: { title?: string; subtitle?: string; backHref?: string; action?: ReactNode }) {
  await connection();
  const start = mondayOf(todayInBogota());
  const end = addDays(start, 6);
  const month = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" }).replace(".", "");
  return <header className="flex flex-col gap-4 px-5 pt-5 pb-6">
    <div className="flex items-center justify-between">
      <Link href={backHref} aria-label="Volver" className="btn-outline flex size-11 items-center justify-center rounded-full border border-line"><Icon name="arrow-left" size={20} /></Link>
      {action}
    </div>
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[40px] leading-none">{title}</h1>
      <p className="text-[14px] text-ink-muted">{subtitle ?? `Esta semana · ${dayOfMonth(start)} ${month(start)} – ${dayOfMonth(end)} ${month(end)}`}</p>
    </div>
  </header>;
}
