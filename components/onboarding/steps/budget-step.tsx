"use client";

import { Button } from "@heroui/react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { householdPortions } from "@/lib/household/portions";
import { saveBudget } from "@/lib/onboarding/actions";
import { BUDGET, budgetTier, formatCop, formatCopK } from "@/lib/onboarding/options";
import { useStepSave } from "../use-step-save";

const TICK_SPACING = 12;
const TICKS = Array.from(
  { length: (BUDGET.max - BUDGET.min) / BUDGET.step + 1 },
  (_, index) => BUDGET.min + index * BUDGET.step,
);

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

function BudgetRuler({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const selected = useRef(value);
  const frame = useRef<number | null>(null);
  const keyboardScroll = useRef(false);
  const drag = useRef<{ pointerId: number; x: number; left: number } | null>(null);

  useLayoutEffect(() => {
    strip.current?.scrollTo({
      left: ((selected.current - BUDGET.min) / BUDGET.step) * TICK_SPACING,
      behavior: "instant",
    });
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function select(next: number) {
    if (next === selected.current) return;
    selected.current = next;
    onChange(next);
    navigator.vibrate?.(4);
  }

  function onScroll() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!strip.current || keyboardScroll.current) return;
      const index = Math.max(0, Math.min(TICKS.length - 1, Math.round(strip.current.scrollLeft / TICK_SPACING)));
      select(TICKS[index]);
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = selected.current - BUDGET.step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = selected.current + BUDGET.step;
        break;
      case "PageDown":
        next = selected.current - 50_000;
        break;
      case "PageUp":
        next = selected.current + 50_000;
        break;
      case "Home":
        next = BUDGET.min;
        break;
      case "End":
        next = BUDGET.max;
        break;
      default:
        return;
    }
    event.preventDefault();
    next = Math.max(BUDGET.min, Math.min(BUDGET.max, next));
    select(next);
    // Keep intermediate frames of a smooth keyboard scroll from changing the selected amount.
    keyboardScroll.current = true;
    strip.current?.scrollTo({ left: ((next - BUDGET.min) / BUDGET.step) * TICK_SPACING, behavior: scrollBehavior() });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    keyboardScroll.current = false;
    wrapper.current?.focus({ preventScroll: true });
    if (event.pointerType !== "mouse") return;
    event.preventDefault();
    drag.current = { pointerId: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft };
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    event.currentTarget.scrollTo({
      left: Math.round(event.currentTarget.scrollLeft / TICK_SPACING) * TICK_SPACING,
      behavior: scrollBehavior(),
    });
  }

  return (
    <div
      ref={wrapper}
      role="slider"
      tabIndex={0}
      aria-label="Presupuesto semanal"
      aria-orientation="horizontal"
      aria-valuemin={BUDGET.min}
      aria-valuemax={BUDGET.max}
      aria-valuenow={value}
      aria-valuetext={`${formatCop(value)} por semana`}
      onKeyDown={onKeyDown}
      className="relative mt-8 w-full rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
    >
      <div
        ref={strip}
        tabIndex={-1}
        onScroll={onScroll}
        onScrollEnd={() => { keyboardScroll.current = false; onScroll(); }}
        onWheel={() => { keyboardScroll.current = false; }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain pt-3 pb-2 outline-none [scrollbar-width:none] data-[dragging=true]:snap-none [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [&::-webkit-scrollbar]:hidden"
        style={{ paddingInline: `calc(50% - ${TICK_SPACING / 2}px)` }}
      >
        <div aria-hidden="true" className="flex w-max cursor-grab active:cursor-grabbing">
          {TICKS.map((amount) => {
            const major = amount % 50_000 === 0;
            return (
              <span key={amount} className="relative flex h-[68px] w-3 shrink-0 snap-center flex-col items-center">
                <span className={`w-px bg-[#a9a9a9] ${major ? "h-7" : "h-3.5"}`} />
                {major ? (
                  <span className="absolute top-10 font-display text-[13px] leading-4 whitespace-nowrap text-[#8f8f8f]">
                    {amount / 1_000}k
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 h-11 w-0.5 -translate-x-1/2 bg-ink" />
    </div>
  );
}

export function BudgetStep({
  initial,
  adults,
  kids,
  progress,
  back,
  nextHref,
}: {
  initial: number | null;
  adults: number;
  kids: number;
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  const [value, setValue] = useState(initial ?? BUDGET.default);
  const { save, pending, error } = useStepSave(nextHref);
  const tier = budgetTier(value);
  const perPortion = value / householdPortions({ adults, kids });

  return (
    <FlowScreen
      back={back ?? undefined}
      progress={progress}
      title="¿Cuál es tu presupuesto?"
      subtitle="Mantendremos el mercado de la semana dentro de él."
      action={<NextButton loading={pending} onPress={() => save(() => saveBudget(value))} />}
      secondaryAction={
        <Button
          variant="ghost"
          isDisabled={pending}
          onPress={() => save(() => saveBudget(null))}
          className="h-auto rounded-none bg-transparent p-0 font-sans text-[14px] font-normal whitespace-normal text-ink underline underline-offset-4 hover:bg-transparent data-[hovered=true]:bg-transparent data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-brand data-[focus-visible=true]:outline-offset-4"
        >
          No tengo un presupuesto fijo
        </Button>
      }
    >
      <div className="flex w-full flex-col items-center pt-2 text-center">
        <p className="h-[1.1em] w-full font-display text-[clamp(48px,24vw,96px)] leading-[1.1] whitespace-nowrap text-ink tabular-nums">
          <span key={value} className="block transition-[opacity,transform] duration-200 ease-out-soft motion-reduce:transition-none starting:translate-y-1 starting:opacity-60 motion-reduce:starting:translate-y-0">
            {formatCopK(value)}{value >= BUDGET.max ? "+" : ""}
          </span>
        </p>
        <p className="mt-2 font-display text-[16px] leading-5 text-[#8f8f8f]">por semana</p>
        <BudgetRuler value={value} onChange={setValue} />
        <p className="mt-7 text-balance">
          <span className="font-display text-[17px] text-ink">{tier.label}</span>
          <span className="font-sans text-[15px] text-[#8f8f8f]"> · {tier.description}</span>
        </p>
        <p className="mt-3 font-sans text-[14px] text-[#8f8f8f]">≈ {formatCopK(perPortion)} por porción a la semana</p>
      </div>
      {error ? <p role="alert" className="mt-6 font-sans text-[14px] text-danger">{error}</p> : null}
    </FlowScreen>
  );
}
