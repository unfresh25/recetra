"use client";

import { Checkbox, CheckboxGroup } from "@heroui/react";
import Image from "next/image";
import { useState } from "react";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { SquareCheck } from "@/components/ui/square-check";
import type { ActionResult } from "@/lib/onboarding/actions";
import { useStepSave } from "./use-step-save";

type PhotoOption = { value: string; label: string; description?: string; image: string };

export function PhotoOptionStep({
  title,
  subtitle,
  options,
  initial,
  min,
  max,
  done = false,
  onSave,
  progress,
  back,
  nextHref,
  imageSizes = "60px",
}: {
  title: string;
  subtitle: string;
  options: PhotoOption[];
  min: number;
  max?: number;
  done?: boolean;
  onSave: (values: string[]) => Promise<ActionResult>;
  imageSizes?: string;
  initial: string[];
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const { save, pending, error } = useStepSave(nextHref);
  const atMax = max !== undefined && selected.size >= max;

  return (
    <FlowScreen
      back={back ?? undefined}
      progress={progress}
      title={title}
      subtitle={subtitle}
      secondaryAction={
        max !== undefined && selected.size > 0 ? (
          <span className="font-sans text-[14px] text-[#8f8f8f]">
            {selected.size} de {max}
          </span>
        ) : null
      }
      action={
        <NextButton
          done={done}
          isDisabled={selected.size < min}
          loading={pending}
          onPress={() => save(() => onSave([...selected]))}
        />
      }
    >
      <CheckboxGroup
        aria-label={title}
        value={[...selected]}
        onChange={(values) => {
          if (max === undefined || values.length <= max) {
            setSelected(new Set(values));
          }
        }}
        className="flex flex-col gap-[30px]"
      >
        {options.map((option, index) => (
          <Checkbox
            key={option.value}
            value={option.value}
            aria-label={option.label}
            isDisabled={atMax && !selected.has(option.value)}
            className="btn-ghost mt-0 w-full data-[disabled=true]:opacity-40"
          >
            <Checkbox.Content className="flex w-full items-center gap-2.5">
              {({ isSelected, isFocusVisible }) => (
                <>
                  <Image
                    src={option.image}
                    alt=""
                    width={60}
                    height={60}
                    sizes={imageSizes}
                    loading={index < 4 ? "eager" : undefined}
                    className="size-15 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[16px] leading-5 font-normal text-ink">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block font-sans text-[13px] leading-4 font-normal text-[#8f8f8f]">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <SquareCheck checked={isSelected} focusVisible={isFocusVisible} />
                </>
              )}
            </Checkbox.Content>
          </Checkbox>
        ))}
      </CheckboxGroup>
      {error ? (
        <p role="alert" className="mt-6 font-sans text-[14px] text-danger">
          {error}
        </p>
      ) : null}
    </FlowScreen>
  );
}
