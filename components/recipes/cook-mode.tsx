"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DrawablyUnderline } from "@/components/ui/drawably";
import { Icon } from "@/components/ui/icon";
import { markCooked } from "@/lib/plan/actions";
import { formatDuration, tokenizeStep, type StepToken } from "@/lib/recipes/step-tokens";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils/cn";
import { StepVideo } from "./step-video";
import { NewTimerSheet, TimerTray, useTimers } from "./timers";

type Step = { position: number; text: string; video_start_seconds: number | null };
type Ingredient = { name: string; aliases: string[]; amount: string; removed: boolean };

/** Crayon variants so consecutive ingredients never look stamped. */
const CRAYON = [
  { roughness: 1.4, width: 3 },
  { roughness: 2.2, width: 3.5 },
  { roughness: 1.8, width: 2.5 },
  { roughness: 2.6, width: 4 },
];

/**
 * Kitchen Stories-style step text: tools get their icon, ingredients a hand-drawn crayon underline,
 * and times / temperatures / heat levels an icon in the brand color. Times are tappable timers.
 */
function StepText({
  tokens,
  onTime,
}: {
  tokens: StepToken[];
  onTime: (seconds: number, text: string) => void;
}) {
  return (
    <p className="text-[26px] font-semibold leading-[1.55] tracking-tight">
      {tokens.map((t, i) => {
        switch (t.kind) {
          case "text":
            return <span key={i}>{t.text}</span>;
          case "ingredient": {
            const v = CRAYON[(t.index + i) % CRAYON.length]!;
            return (
              <DrawablyUnderline key={i} stroke="var(--color-brand)" roughness={v.roughness} width={v.width} boil={0.6}>
                {t.text}
              </DrawablyUnderline>
            );
          }
          case "tool":
            return (
              <span key={i} className="whitespace-nowrap">
                <Icon name={t.icon} size={24} className="mr-1 inline-block -translate-y-0.5 text-ink-muted" />
                {t.text}
              </span>
            );
          case "time":
            return (
              <button
                key={i}
                type="button"
                onClick={() => onTime(t.seconds, t.text)}
                aria-label={`Crear temporizador de ${t.text}`}
                className="whitespace-nowrap font-bold text-brand underline decoration-brand/30 decoration-dotted underline-offset-[6px]"
              >
                <Icon name="timer" size={24} className="mr-1 inline-block -translate-y-0.5" />
                {t.text}
              </button>
            );
          case "temperature":
            return (
              <span key={i} className="whitespace-nowrap font-bold text-brand">
                <Icon name="thermometer" size={24} className="mr-1 inline-block -translate-y-0.5" />
                {t.text}
              </span>
            );
          case "heat":
            return (
              <span key={i} className="whitespace-nowrap font-bold text-brand">
                <Icon name="fire" size={24} className="mr-1 inline-block -translate-y-0.5" />
                {t.text}
              </span>
            );
        }
      })}
    </p>
  );
}

export function CookMode({
  recipeId,
  title,
  platform,
  videoId,
  steps,
  ingredients,
  planMealId,
}: {
  recipeId: string;
  title: string;
  platform: Enums<"source_platform">;
  videoId: string | null;
  steps: Step[];
  ingredients: Ingredient[];
  planMealId: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [newTimer, setNewTimer] = useState(false);
  const [finishing, startFinishing] = useTransition();
  const timers = useTimers();
  const step = steps[index]!;
  const last = index === steps.length - 1;

  const names = useMemo(() => ingredients.map((i) => [i.name, ...i.aliases]), [ingredients]);
  const tokens = useMemo(() => tokenizeStep(step.text, names), [step.text, names]);

  // Keep the screen on while cooking.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release();
  }, []);

  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <div className="relative aspect-video w-full bg-ink">
        {videoId ? (
          <StepVideo platform={platform} videoId={videoId} startSeconds={step.video_start_seconds} title={title} />
        ) : null}
        <Link
          href={`/recipes/${recipeId}${planMealId ? `?meal=${planMealId}` : ""}`}
          aria-label="Salir del modo cocinar"
          className="absolute left-2 top-2 flex size-11 items-center justify-center text-white"
        >
          <Icon name="close" size={26} />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pt-5">
        <div className="flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.position} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-brand" : "bg-sunken")} />
          ))}
        </div>
        <div className="flex items-baseline justify-between">
          <p className="font-condensed text-[34px] font-extrabold leading-none">
            Paso {index + 1} <span className="text-lg font-semibold text-ink-muted">de {steps.length}</span>
          </p>
          <button type="button" onClick={() => setNewTimer(true)} className="flex items-center gap-1.5 text-sm font-semibold text-brand">
            <Icon name="alarm" size={18} /> Temporizador
          </button>
        </div>
        <StepText
          tokens={tokens}
          onTime={(seconds) => timers.add(`Paso ${index + 1} · ${formatDuration(seconds)}`, seconds)}
        />
      </div>

      <div className="sticky bottom-0 bg-canvas pt-3">
        <TimerTray api={timers} />
        <div className="flex items-center gap-3 px-5 pb-safe">
          <Button variant="secondary" size="md" onClick={() => setShowIngredients(true)}>
            Ingredientes
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Paso anterior"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              className="flex size-14 items-center justify-center text-ink disabled:text-ink-faint"
            >
              <Icon name="arrow-left" size={28} />
            </button>
            {last ? (
              <Button
                loading={finishing}
                onClick={() =>
                  startFinishing(async () => {
                    await markCooked(recipeId, planMealId ?? undefined);
                    router.push(planMealId ? "/plan" : `/recipes/${recipeId}`);
                  })
                }
              >
                ¡Terminé!
              </Button>
            ) : (
              <Button aria-label="Siguiente paso" size="md" className="size-14 px-0" onClick={() => setIndex((i) => i + 1)}>
                <Icon name="arrow-right" size={26} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {newTimer ? (
        <NewTimerSheet defaultLabel={`Paso ${index + 1}`} onCreate={timers.add} onClose={() => setNewTimer(false)} />
      ) : null}

      {showIngredients ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowIngredients(false)}>
          <div
            role="dialog"
            aria-label="Ingredientes"
            className="mx-auto max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-canvas px-5 pt-3 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
            <p className="mb-2 font-condensed text-3xl font-extrabold">Ingredientes</p>
            <ul>
              {ingredients.map((i) => (
                <li
                  key={i.name}
                  className={cn("flex justify-between gap-3 border-b border-line py-3 last:border-b-0", i.removed && "text-ink-faint line-through")}
                >
                  <span className="font-medium">{i.name}</span>
                  <span className="text-ink-muted">{i.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </main>
  );
}
