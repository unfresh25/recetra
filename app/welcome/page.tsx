import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { StartButton } from "./start-button";
import hero from "@/public/images/welcome-hummus.webp";

export const metadata: Metadata = { title: "Bienvenida" };

export const viewport: Viewport = { themeColor: "#8d9aa6" };

export default function WelcomePage() {
  return (
    <main className="relative isolate flex flex-1 flex-col px-5 pt-safe pb-[max(env(safe-area-inset-bottom),min(3rem,5dvh))] font-display text-white">
      {/* Fixed so the photo covers the whole viewport, not just the app column. */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-black">
        <Image
          src={hero}
          alt=""
          fill
          preload
          sizes="100vw"
          placeholder="blur"
          className="animate-settle object-cover object-[30%_40%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.35)_0%,transparent_18%,transparent_30%,rgb(0_0_0/0.72)_54%,rgb(0_0_0/0.9)_100%)]" />
      </div>

      <Logo className="mt-5 h-7 self-start" />

      <div className="mt-auto flex flex-col items-center">
        <h1 className="text-balance text-center text-[min(11vw,5.5dvh,48px)] leading-[1.05] tracking-tight">
          Descubre al chef que llevas dentro
        </h1>

        <StartButton className="mt-[min(2rem,3.5dvh)]" />

        <p className="mt-[min(1.75rem,3dvh)] text-center font-sans text-xs leading-[18px] text-[#a9a9a9]">
          Al continuar, aceptas nuestras
          <br />
          <Link href="/legal/terms" className="text-white underline underline-offset-2">
            Condiciones de uso
          </Link>{" "}
          y{" "}
          <Link href="/legal/privacy" className="text-white underline underline-offset-2">
            Aviso de privacidad
          </Link>
        </p>
      </div>
    </main>
  );
}
