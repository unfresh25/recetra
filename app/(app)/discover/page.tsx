import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DiscoverFeed } from "@/components/discover/feed";
import { Icon } from "@/components/ui/icon";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { requireReadyMembership } from "@/lib/auth";
import { getDiscover } from "@/lib/discover/queries";

export const metadata: Metadata = { title: "Descubre" };

export default function DiscoverPage() {
  return <Suspense fallback={<PanLoaderScreen />}><DiscoverContent /></Suspense>;
}

async function DiscoverContent() {
  const membership = await requireReadyMembership();
  const data = await getDiscover(membership);
  return (
    <div className="bg-canvas text-ink">
      <ScreenHeader
        title="Descubre"
        titleClassName="font-display text-[32px] font-semibold leading-tight tracking-tight"
        subtitle={`Hola, ${membership.member.display_name}. ¿Qué cocinamos hoy?`}
        action={<Link href="/ask" aria-label="Preguntar a Carmy" className="flex size-11 items-center justify-center text-ink"><Icon name="chef-hat" size={24} /></Link>}
      />
      <DiscoverFeed data={data} styles={membership.household.styles} />
    </div>
  );
}
