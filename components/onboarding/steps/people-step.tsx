"use client";

import { Description, Label, NumberField } from "@heroui/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { savePeople } from "@/lib/onboarding/actions";
import { useStepSave } from "../use-step-save";

function AdultsPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const gesture = useRef<{ pointerId: number; x: number; y: number; value: number | null } | null>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = value - 1;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = value + 1;
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 12;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(Math.max(1, Math.min(12, next)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const number = (event.target as HTMLElement).closest<HTMLElement>("[data-adults]");
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      value: number ? Number(number.dataset.adults) : null,
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      onChange(Math.max(1, Math.min(12, value + (dx < 0 ? 1 : -1))));
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && start.value !== null && Math.abs(start.value - value) === 1) {
      onChange(start.value);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <p className="text-center font-display text-[16px] leading-5 text-[#8f8f8f]">Adultos</p>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Adultos"
        aria-orientation="horizontal"
        aria-valuemin={1}
        aria-valuemax={12}
        aria-valuenow={value}
        aria-valuetext={`${value} ${value === 1 ? "adulto" : "adultos"}`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { gesture.current = null; }}
        onLostPointerCapture={() => { gesture.current = null; }}
        className="relative mt-3 h-[252px] touch-pan-y touch-pinch-zoom cursor-grab overflow-hidden rounded-3xl outline-none select-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-canvas active:cursor-grabbing"
      >
        {Array.from({ length: 12 }, (_, index) => {
          const number = index + 1;
          const offset = number - value;
          const visible = Math.abs(offset) <= 1;
          return (
            <span
              key={number}
              aria-hidden="true"
              data-adults={number}
              className={`absolute top-0 left-1/3 flex h-44 w-1/3 items-center justify-center font-display text-[146px] leading-[176px] transition-[transform,opacity] duration-250 ease-out-soft motion-reduce:transition-none ${offset === 0 ? "text-ink" : "text-[#a9a9a9]"} ${visible ? "" : "pointer-events-none"}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: `translateX(${Math.max(-2, Math.min(2, offset)) * 100}%) translateY(${offset < 0 ? 62 : offset > 0 ? 41 : 0}px) rotate(${offset < 0 ? -15 : offset > 0 ? 15 : 0}deg) scale(${offset === 0 ? 1 : 128 / 146})`,
              }}
            >
              {number}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const kidsButtonClass = "flex size-9 shrink-0 items-center justify-center rounded-full border border-[#a9a9a9] bg-transparent p-0 font-display text-[22px] font-normal text-ink outline-none data-[disabled=true]:opacity-40 data-[focus-visible=true]:outline-solid data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-brand data-[focus-visible=true]:outline-offset-2";

export function PeopleStep({
  adults: initialAdults,
  kids: initialKids,
  progress,
  back,
  nextHref,
}: {
  adults: number;
  kids: number;
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  const [adults, setAdults] = useState(initialAdults);
  const [kids, setKids] = useState(initialKids);
  const { save, pending, error } = useStepSave(nextHref);

  return (
    <FlowScreen
      back={back ?? undefined}
      progress={progress}
      title="¿Cuántas bocas debes alimentar?"
      subtitle="Cuéntanos para cuántas personas vas a cocinar regularmente."
      action={<NextButton loading={pending} onPress={() => save(() => savePeople(adults, kids))} />}
    >
      <div className="pt-8">
        <AdultsPicker value={adults} onChange={setAdults} />
      </div>
      <NumberField
        value={kids}
        onChange={(value) => setKids(Number.isNaN(value) ? 0 : Math.max(0, Math.min(12, value)))}
        minValue={0}
        maxValue={12}
        step={1}
        className="mt-10 flex w-full flex-row items-center justify-between gap-3"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <Label className="font-display text-[17px] leading-[22px] font-normal text-ink">¿También cocinas para niños?</Label>
          <Description className="font-sans text-[13px] leading-[18px] text-[#8f8f8f]">Cada niño cuenta como media porción.</Description>
        </div>
        <NumberField.Group
          style={{ boxShadow: "none", outline: "none" }}
          className="flex h-auto shrink-0 gap-2 overflow-visible rounded-none border-0 bg-transparent hover:bg-transparent focus-within:bg-transparent data-[hovered=true]:bg-transparent data-[focus-within=true]:bg-transparent"
        >
          <NumberField.DecrementButton aria-label="Menos niños" className={kidsButtonClass}>
            <span aria-hidden="true">−</span>
          </NumberField.DecrementButton>
          <NumberField.Input
            aria-valuetext={`${kids} ${kids === 1 ? "niño" : "niños"}`}
            className="w-7 p-0 text-center font-display text-[20px] leading-9 text-ink tabular-nums sm:text-[20px]"
          />
          <NumberField.IncrementButton aria-label="Más niños" className={kidsButtonClass}>
            <span aria-hidden="true">+</span>
          </NumberField.IncrementButton>
        </NumberField.Group>
      </NumberField>
      {error ? <p role="alert" className="mt-6 font-sans text-[14px] text-danger">{error}</p> : null}
    </FlowScreen>
  );
}
