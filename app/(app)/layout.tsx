import { ServiceWorker } from "@/components/app/service-worker";
import { TabBar } from "@/components/app/tab-bar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="flex flex-1 flex-col pb-32">{children}</main>
      <TabBar />
      <ServiceWorker />
    </>
  );
}
