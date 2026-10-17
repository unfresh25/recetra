"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { markCooked } from "@/lib/plan/actions";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils/cn";
import { StepVideo } from "./step-video";

type Step = { position: number; text: string; video_start_seconds: number | null };
type Ingredient = { name: string; amount: string; removed: boolean };

const TIMER = /(\d+(?:[.,]\d+)?)\s*(minutos?|min\b|horas?|segundos?)/gi;

function toSeconds(value: string, unit: string) {
  const n = Number(value.replace(",", "."));
  if (unit.startsWith("hora")) return n * 3600;
  if (unit.startsWith("seg")) return n;
  return n * 60;
}

function formatClock(total: number) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Splits step text so "10 minutos" becomes a tappable timer. */
function StepText({ text, onTimer }: { text: string; onTimer: (seconds: number, label: string) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TIMER)) {
    parts.push(text.slice(last, match.index));
    const label = match[0];
    parts.push(
      <button
        key={match.index}
        type="button"
        onClick={() => onTimer(toSeconds(match[1]!, match[2]!.toLowerCase()), label)}
        className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 align-baseline font-semibold text-brand"
      >
        ⏱️ {label}
      </button>,
    );
    last = (match.index ?? 0) + label.length;
  }
  parts.push(text.slice(last));
  return <p className="font-display text-[26px] font-bold leading-snug tracking-tight">{parts}</p>;
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
  const [timer, setTimer] = useState<{ endsAt: number; label: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, startFinishing] = useTransition();
  const step = steps[index]!;
  const last = index === steps.length - 1;

  // Keep the screen on while cooking.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release();
  }, []);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = timer ? (timer.endsAt - now) / 1000 : 0;
  useEffect(() => {
    if (timer && remaining <= 0) navigator.vibrate?.([300, 150, 300]);
  }, [timer, remaining]);


  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-surface">
      <div className="relative aspect-video w-full bg-black">
        {videoId ? (
          <StepVideo platform={platform} videoId={videoId} startSeconds={step.video_start_seconds} title={title} />
        ) : null}
        <Link
          href={`/recipes/${recipeId}${planMealId ? `?meal=${planMealId}` : ""}`}
          aria-label="Salir del modo cocinar"
          className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/85 text-ink shadow-card backdrop-blur"
        >
          <Icon name="close" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pt-5">
        <div className="flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.position} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-brand" : "bg-brand-soft")} />
          ))}
        </div>
        <p className="font-display text-2xl font-extrabold">
          Paso {index + 1} <span className="text-base font-semibold text-ink-muted">de {steps.length}</span>
        </p>
        <StepText text={step.text} onTimer={(seconds, label) => setTimer({ endsAt: Date.now() + seconds * 1000, label })} />
      </div>

      {timer ? (
        <div
          role="timer"
          className={cn(
            "mx-5 mb-3 flex items-center justify-between rounded-full px-5 py-3 font-display text-lg font-bold tabular",
            remaining <= 0 ? "animate-pulse bg-brand text-white" : "bg-ink text-white",
          )}
        >
          <span>⏱️ {remaining <= 0 ? "¡Listo!" : formatClock(remaining)}</span>
          <span className="flex gap-2 text-sm">
            <button type="button" onClick={() => setTimer({ ...timer, endsAt: timer.endsAt + 60_000 })}>+1 min</button>
            <button type="button" onClick={() => setTimer(null)} aria-label="Quitar temporizador">✕</button>
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-3 px-5 pb-safe">
        <Button variant="secondary" size="md" onClick={() => setShowIngredients(true)}>
          Ingredientes
        </Button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            aria-label="Paso anterior"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
            className="flex size-14 items-center justify-center rounded-full bg-sunken disabled:opacity-40"
          >
            <Icon name="arrow-left" />
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
            <button
              type="button"
              aria-label="Siguiente paso"
              onClick={() => setIndex((i) => i + 1)}
              className="flex size-14 items-center justify-center rounded-full bg-brand text-white"
            >
              <Icon name="arrow-right" />
            </button>
          )}
        </div>
      </div>

      {showIngredients ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowIngredients(false)}>
          <div
            role="dialog"
            aria-label="Ingredientes"
            className="mx-auto max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-3 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
            <p className="mb-2 font-display text-xl font-bold">Ingredientes</p>
            <ul className="divide-y divide-line">
              {ingredients.map((i) => (
                <li key={i.name} className={cn("flex justify-between gap-3 py-3", i.removed && "text-ink-faint line-through")}>
                  <span className="font-semibold">{i.name}</span>
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
