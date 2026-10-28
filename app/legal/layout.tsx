import { BackButton } from "@/components/ui/back-button";
import { Logo } from "@/components/ui/logo";

export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <main className="relative isolate flex flex-1 flex-col pt-safe pb-safe text-ink">
      {/* Fixed so the canvas covers the whole viewport, not just the app column. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-canvas" />
      <header className="relative flex h-16 items-center justify-center px-6">
        <BackButton fallback="/welcome" className="absolute left-4" />
        <Logo className="h-7" />
      </header>
      <article className="flex flex-col gap-10 px-6 pt-6 pb-16 font-sans text-[17px] leading-[1.6] [&_a]:underline [&_h1]:font-display [&_h1]:text-[36px] [&_h1]:leading-[1.05] [&_h1]:tracking-tight [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:leading-tight [&_h2]:tracking-tight [&_li]:pl-1 [&_section>p+p]:mt-1 [&_strong]:font-semibold [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </article>
    </main>
  );
}
