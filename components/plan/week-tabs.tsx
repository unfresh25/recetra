"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function WeekTabs({ tabs, weekStart }: { tabs: { start: string; range: string; label: string }[]; weekStart: string }) {
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = row.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && selected) nav.scrollLeft += selected.getBoundingClientRect().left - nav.getBoundingClientRect().left - 20;
  }, [weekStart]);
  return <nav ref={row} aria-label="Semanas" className="-mx-5 flex gap-7 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {tabs.map(({ start, range, label }) => <Link key={start} href={`/plan?week=${start}`} scroll={false} aria-current={start === weekStart ? "page" : undefined} className={`link-text flex shrink-0 flex-col gap-1 ${start === weekStart ? "text-ink" : "text-ink-faint"}`}>
      <span className="text-[11px]">{range}</span>
      <span className="font-display text-[30px] leading-tight">{label}</span>
    </Link>)}
  </nav>;
}
