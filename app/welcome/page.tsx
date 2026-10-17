import type { Metadata } from "next";
import { WelcomeCarousel } from "./welcome-carousel";

export const metadata: Metadata = { title: "Bienvenida" };

export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col pt-safe">
      <p className="py-4 text-center font-condensed text-3xl font-extrabold tracking-tight">
        Recetra
      </p>
      <WelcomeCarousel />
    </main>
  );
}
