import Link from "next/link";

export function ShoppingEmpty({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="flex flex-col items-center gap-3 py-12 text-center">
    <h2 className="max-w-72 font-display text-[32px] leading-[1.1]">{title}</h2>
    <p className="max-w-80 text-[14px] leading-relaxed text-ink-muted">{description}</p>
    {href && action ? <Link href={href} className="btn-ink mt-2 inline-flex h-12 min-w-[200px] items-center justify-center rounded-full bg-ink px-6 font-display text-[15px] text-white">{action}</Link> : null}
  </div>;
}
