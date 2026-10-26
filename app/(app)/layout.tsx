import { Suspense } from "react";
import { ServiceWorker } from "@/components/app/service-worker";
import { TabBar } from "@/components/app/tab-bar";
import { requireReadyMembership } from "@/lib/auth";
import { getMemberAvatarUrl } from "@/lib/household/queries";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="flex flex-1 flex-col pb-32">{children}</main>
      <Suspense fallback={<TabBar />}>
        <MemberTabBar />
      </Suspense>
      <ServiceWorker />
    </>
  );
}

async function MemberTabBar() {
  const { member } = await requireReadyMembership();
  const avatarUrl = await getMemberAvatarUrl(member.id);
  return <TabBar avatarUrl={avatarUrl} />;
}
