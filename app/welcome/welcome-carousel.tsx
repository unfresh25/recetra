"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { DrawablyUnderline } from "@/components/ui/drawably";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { cn } from "@/lib/utils/cn";

const slides: { art: IllustrationName; title: string; mark: string; body: string }[] = [
  {
    art: "welcome-plan",
    title: "Tu semana, resuelta",
    mark: "resuelta",
    body: "Desayuno, almuerzo y cena con recetas reales de creadores que admiras, pensadas para los dos.",
  },
  {
    art: "welcome-shopping",
    title: "Compra donde más rinde",
    mark: "rinde",
    body: "Comparamos el precio de cada ingrediente en tus supermercados y te decimos dónde ahorrar.",
  },
  {
    art: "welcome-taste",
    title: "Aprende de sus gustos",
    mark: "gustos",
    body: "Sin cilantro, sin mariscos, sin sorpresas. Cada favorito y cada cambio afinan el próximo plan.",
  },
];

export function WelcomeCarousel() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const isLast = index === slides.length - 1;

  function goTo(i: number) {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(slides.length - 1, i));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
    setIndex(target);
  }

  function onScroll() {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "ArrowLeft") goTo(index - 1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end px-5">
        <Link
          href="/login"
          className={cn(
            "h-9 rounded-full px-4 text-sm font-semibold leading-9 text-ink-muted transition-opacity",
            isLast && "pointer-events-none opacity-0",
          )}
          tabIndex={isLast ? -1 : undefined}
        >
          Saltar
        </Link>
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Presentación de Recetra"
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <section
            key={slide.title}
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${slides.length}`}
            aria-hidden={i !== index}
            className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-6 px-8 text-center"
          >
            <Illustration name={slide.art} size={220} preload={i === 0} />
            <div className="flex flex-col gap-3">
              <h2 className="font-condensed text-[52px] font-extrabold leading-[0.95] tracking-tight">
                {slide.title.replace(slide.mark, "")}
                <DrawablyUnderline stroke="var(--color-brand)" width={3}>
                  {slide.mark}
                </DrawablyUnderline>
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-muted">{slide.body}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-center gap-1 py-4">
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ir al slide ${i + 1}`}
            aria-current={i === index ? "step" : undefined}
            className="flex h-8 items-center px-1"
          >
            <span
              className={cn(
                "h-2 rounded-full transition-all duration-300 ease-out-soft",
                i === index ? "w-6 bg-brand" : "w-2 bg-line",
              )}
            />
          </button>
        ))}
      </div>

      <div className="flex justify-center px-5 pb-safe">
        <Button className="min-w-48" onClick={() => (isLast ? router.push("/login") : goTo(index + 1))}>
          {isLast ? "Empezar" : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}
