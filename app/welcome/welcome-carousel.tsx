"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { cn } from "@/lib/utils/cn";

const slides: { art: IllustrationName; title: string; body: string }[] = [
  {
    art: "welcome-plan",
    title: "Tu semana, resuelta",
    body: "Desayuno, almuerzo y cena con recetas reales de creadores que admiras, pensadas para los dos.",
  },
  {
    art: "welcome-shopping",
    title: "Compra donde más rinde",
    body: "Comparamos el precio de cada ingrediente en tus supermercados y te decimos dónde ahorrar.",
  },
  {
    art: "welcome-taste",
    title: "Aprende de sus gustos",
    body: "Sin cilantro, sin mariscos, sin sorpresas. Cada favorito y cada cambio afinan el próximo plan.",
  },
];

export function WelcomeCarousel() {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <section
            key={slide.title}
            className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-6 px-8 text-center"
          >
            <Illustration name={slide.art} size={248} preload={i === 0} />
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-[28px] font-extrabold leading-tight tracking-tight">
                {slide.title}
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-muted">{slide.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-center gap-2 py-6" aria-hidden>
        {slides.map((slide, i) => (
          <span
            key={slide.title}
            className={cn(
              "h-2 rounded-full transition-all duration-300 ease-out-soft",
              i === index ? "w-6 bg-brand" : "w-2 bg-line",
            )}
          />
        ))}
      </div>

      <div className="px-5 pb-safe">
        <Link
          href="/login"
          className="flex h-14 w-full items-center justify-center rounded-full bg-brand font-display text-[17px] font-bold text-white shadow-[0_6px_20px_rgb(232_32_42/0.28)] transition-transform active:scale-[0.97]"
        >
          Empezar
        </Link>
      </div>
    </div>
  );
}
