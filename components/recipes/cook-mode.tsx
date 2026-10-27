"use client";

import { Drawer } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { markCooked } from "@/lib/plan/actions";
import { swipeDirection } from "@/lib/recipes/cook-navigation";
import { formatDuration, stepIngredientIndexes, stepTokenIcon, tokenizeStep, type StepToken } from "@/lib/recipes/step-tokens";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils/cn";
import { StepVideo } from "./step-video";
import { NewTimerSheet, TimerTray, useTimers } from "./timers";

type Step = { position: number; text: string; video_start_seconds: number | null };
type Ingredient = { name: string; aliases: string[]; amount: string; removed: boolean };

function StepText({ tokens, onTime }: { tokens: StepToken[]; onTime: (seconds: number) => void }) {
  return (
    <p className="font-display text-[25px] leading-[1.32]">
      {tokens.map((token, index) => {
        const icon = stepTokenIcon(token);
        if (!icon) return <span key={index}>{token.text}</span>;
        const content = <><Icon name={icon} size={21} className={cn("mr-1 inline-block -translate-y-0.5", token.kind === "tool" && "text-ink-muted")} />{token.text}</>;
        return token.kind === "time" ? (
          <button key={index} type="button" onClick={() => onTime(token.seconds)} aria-label={`Crear temporizador de ${token.text}`} className="link-text inline text-left text-ink underline decoration-2 decoration-dotted underline-offset-[6px]">
            {content}
          </button>
        ) : <span key={index} className="text-ink">{content}</span>;
      })}
    </p>
  );
}

export function CookMode({ recipeId, title, coverUrl, platform, videoId, steps, ingredients, planMealId, servings, moreByAuthor }: {
  recipeId: string;
  title: string;
  coverUrl: string | null;
  platform: Enums<"source_platform">;
  videoId: string | null;
  steps: Step[];
  ingredients: Ingredient[];
  planMealId: string | null;
  servings: number;
  moreByAuthor?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [newTimer, setNewTimer] = useState(false);
  const [marking, startMarking] = useTransition();
  const [error, setError] = useState<string>();
  const [shareMessage, setShareMessage] = useState<string>();
  const timers = useTimers();
  const scrollArea = useRef<HTMLDivElement>(null);
  const stepContent = useRef<HTMLDivElement>(null);
  const closingHeading = useRef<HTMLHeadingElement>(null);
  const stepLabel = useRef<HTMLHeadingElement>(null);
  const motion = useRef<"next" | "previous" | null>(null);
  const step = steps[index]!;
  const last = index === steps.length - 1;
  const recipeHref = `/recipes/${recipeId}${planMealId ? `?meal=${planMealId}` : ""}`;
  const hasVideo = Boolean(videoId && platform !== "manual");
  const names = useMemo(() => ingredients.map((ingredient) => [ingredient.name, ...ingredient.aliases]), [ingredients]);
  const tokens = useMemo(() => tokenizeStep(step.text, names), [step.text, names]);
  const mentioned = stepIngredientIndexes(tokens);
  const timeTokens = tokens.filter((token) => token.kind === "time");

  const navigate = useCallback((direction: "next" | "previous", animate = true) => {
    if (finished || (direction === "previous" && index === 0)) return;
    motion.current = animate ? direction : null;
    if (direction === "next" && last) setFinished(true);
    else setIndex(index + (direction === "next" ? 1 : -1));
  }, [finished, index, last]);

  useLayoutEffect(() => {
    scrollArea.current?.scrollTo({ top: 0 });
    if (finished) closingHeading.current?.focus({ preventScroll: true });
    else stepLabel.current?.focus({ preventScroll: true });
    const direction = motion.current;
    motion.current = null;
    if (!direction || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = stepContent.current?.animate([
      { transform: `translateY(${direction === "next" ? 12 : -12}px)`, opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ], { duration: 180, easing: getComputedStyle(document.documentElement).getPropertyValue("--ease-out-soft").trim() });
    return () => animation?.cancel();
  }, [index, finished]);

  // Reacquire after returning to the app; release even if the request resolves after unmount.
  useEffect(() => {
    let active = true;
    let requesting = false;
    let lock: WakeLockSentinel | null = null;
    async function acquire() {
      if (!active || requesting || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      requesting = true;
      try {
        const acquired = await navigator.wakeLock?.request("screen");
        if (!acquired) return;
        if (!active) await acquired.release();
        else lock = acquired;
      } catch {
        // Unsupported browsers and denied requests can still use cook mode.
      } finally {
        requesting = false;
      }
    }
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (finished || showIngredients || showVideo || newTimer) return;
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      const direction = ["ArrowDown", "ArrowRight", " "].includes(event.key) ? "next" : ["ArrowUp", "ArrowLeft"].includes(event.key) ? "previous" : null;
      if (direction) {
        event.preventDefault();
        navigate(direction, false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, showIngredients, showVideo, newTimer, navigate]);

  useEffect(() => {
    const area = scrollArea.current;
    if (!area || finished) return;
    let start: { x: number; y: number } | null = null;
    let atTop = false;
    let atBottom = false;
    function onStart(event: TouchEvent) {
      start = null;
      if (event.touches.length !== 1 || (event.target instanceof Element && event.target.closest("button, a, [data-no-swipe]"))) return;
      start = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
      atTop = area!.scrollTop <= 1;
      atBottom = area!.scrollTop + area!.clientHeight >= area!.scrollHeight - 1;
    }
    function directionFor(event: TouchEvent) {
      const touch = event.changedTouches[0];
      if (!start || !touch) return null;
      const direction = swipeDirection(start, { x: touch.clientX, y: touch.clientY });
      return (direction === "next" && atBottom) || (direction === "previous" && atTop) ? direction : null;
    }
    function onMove(event: TouchEvent) {
      if (event.touches.length !== 1) start = null;
      // Let long steps scroll normally; only consume a gesture begun at the relevant edge.
      const touch = event.touches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const canNavigate = (dy < 0 && atBottom) || (dy > 0 && atTop);
      if (canNavigate && Math.abs(dy) > 5 && Math.abs(dy) > Math.abs(dx) * 1.25 && event.cancelable) event.preventDefault();
    }
    function onEnd(event: TouchEvent) {
      const direction = directionFor(event);
      start = null;
      if (direction) navigate(direction);
    }
    function onCancel() { start = null; }
    area.addEventListener("touchstart", onStart, { passive: true });
    area.addEventListener("touchmove", onMove, { passive: false });
    area.addEventListener("touchend", onEnd);
    area.addEventListener("touchcancel", onCancel);
    return () => {
      area.removeEventListener("touchstart", onStart);
      area.removeEventListener("touchmove", onMove);
      area.removeEventListener("touchend", onEnd);
      area.removeEventListener("touchcancel", onCancel);
    };
  }, [finished, navigate]);

  async function share() {
    setShareMessage(undefined);
    const url = new URL(`/recipes/${recipeId}`, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Enlace copiado");
    } catch {
      setShareMessage("No pudimos copiar el enlace. Intenta de nuevo.");
    }
  }

  function addStepTimer(seconds: number, running = false) {
    timers.add(`Paso ${index + 1} · ${formatDuration(seconds)}`, seconds, running);
  }

  return (
    <main aria-label="Modo cocina" className="relative isolate flex h-dvh min-h-0 shrink-0 flex-col overflow-hidden bg-canvas text-ink [--focus:var(--color-ink)] [&_:focus-visible]:outline-ink">
      {!finished && coverUrl ? <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[210px] overflow-hidden">
        <Image src={coverUrl} alt="" fill unoptimized sizes="(max-width: 576px) 100vw, 576px" className="scale-110 object-cover opacity-[0.18] blur-[3px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/30 to-canvas" />
      </div> : null}

      <header className="flex shrink-0 items-center justify-between px-5 pt-safe pb-3">
        <Link href={recipeHref} aria-label="Salir del modo cocina" className="btn-outline flex size-10 items-center justify-center rounded-xl border border-line bg-canvas/80"><Icon name="close" size={21} /></Link>
        {!finished && hasVideo ? <button type="button" onClick={() => setShowVideo(true)} className="btn-outline flex h-10 items-center gap-2 rounded-full border border-line bg-canvas/80 px-4 font-display text-[14px]"><Icon name="play" size={17} />Ver video</button> : null}
      </header>

      <div ref={scrollArea} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-5 pb-8">
        {finished ? <div className="pb-8">
          <header className="flex flex-col gap-2 pt-5 pb-8">
            <h1 tabIndex={-1} ref={closingHeading} className="font-display text-[32px] leading-[1.15]">{title}</h1>
            <p className="text-sm text-ink-muted">Para {servings} porciones</p>
          </header>
          <div className="flex flex-col gap-2.5">
            <Button block loading={marking} disabled={cooked} className="bg-ink text-white shadow-none" onPress={() => {
              setError(undefined);
              startMarking(async () => {
                try {
                  await markCooked(recipeId, planMealId ?? undefined);
                  setCooked(true);
                } catch {
                  setError("No pudimos marcar la receta como cocinada. Intenta de nuevo.");
                }
              });
            }}>{!marking ? <Icon name="check" size={20} /> : null}{marking ? "Guardando…" : cooked ? "Cocinada" : "Marcar como cocinada"}</Button>
            {error ? <p role="alert" className="text-sm text-ink-muted">{error}</p> : null}
            <Button block variant="secondary" className="border-line shadow-none" onPress={share}><Icon name="share" size={20} />Compartir</Button>
            {shareMessage ? <p role="status" className="text-center text-xs text-ink-muted">{shareMessage}</p> : null}
            <Link href="/ask" className="btn-outline flex h-14 items-center justify-center gap-2 rounded-full border border-line font-display text-[17px]"><Icon name="chef-hat" size={21} />Pregúntale a Carmy</Link>
          </div>
          <div className="mt-9">{moreByAuthor}</div>
        </div> : <div ref={stepContent} className="flex gap-5 pt-9 pb-5">
          <div aria-hidden className="flex shrink-0 flex-col gap-[5px] pt-1">
            {steps.map((item, stepIndex) => <span key={item.position} className={cn("h-4 w-[3px] rounded-full", stepIndex <= index ? "bg-ink" : "bg-[#e2ded8]")} />)}
          </div>
          <section className="min-w-0 flex-1">
            <h1 ref={stepLabel} tabIndex={-1} className="mb-5 text-xs text-ink-muted focus-visible:outline-none">Paso {String(index + 1).padStart(2, "0")} de {String(steps.length).padStart(2, "0")}</h1>
            <StepText tokens={tokens} onTime={(seconds) => addStepTimer(seconds)} />
            {timeTokens.length ? <div className="mt-5 flex flex-wrap gap-2">
              {timeTokens.map((token, tokenIndex) => <button key={tokenIndex} type="button" onClick={() => addStepTimer(token.seconds, true)} className="btn-ink flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 py-2 font-display text-[13px] text-white"><Icon name="timer" size={17} />Temporizador {formatDuration(token.seconds)}</button>)}
            </div> : null}
            {mentioned.length ? <section className="mt-7">
              <h2 className="mb-3 text-xs text-ink-muted">Ingredientes de este paso</h2>
              <ul data-no-swipe className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {mentioned.map((ingredientIndex) => {
                  const ingredient = ingredients[ingredientIndex]!;
                  return <li key={ingredientIndex} className={cn("min-w-28 max-w-44 shrink-0 rounded-[14px] border border-line px-3.5 py-3", ingredient.removed && "line-through opacity-50")}>
                    <p className="font-display text-[14px]">{ingredient.name}</p>
                    <p className="mt-1 text-xs text-ink-muted">{ingredient.amount}</p>
                  </li>;
                })}
              </ul>
            </section> : null}
          </section>
        </div>}
      </div>

      {!finished ? <nav aria-label="Pasos de la receta" className="flex shrink-0 flex-col items-center gap-2 bg-canvas px-5 py-3">
        <div className="flex w-full items-center justify-center gap-5">
          {index > 0 ? <button type="button" onClick={() => navigate("previous")} className="link-text min-h-11 shrink-0 font-display text-xs text-ink-muted">Paso anterior</button> : null}
          {last ? <Button block className="bg-ink text-white shadow-none" onPress={() => navigate("next")}>Terminar</Button> : <button type="button" aria-label="Siguiente paso" onClick={() => navigate("next")} className="btn-outline flex size-11 shrink-0 items-center justify-center rounded-full border border-line"><Icon name="arrow-up" size={22} /></button>}
        </div>
        {index === 0 ? <p className="text-center text-[11.5px] text-ink-muted">Desliza hacia arriba para el siguiente paso</p> : null}
      </nav> : null}

      {!finished ? <footer className="shrink-0 border-t border-line bg-canvas px-5 [padding-bottom:env(safe-area-inset-bottom)]">
        <div className="flex h-14 items-center gap-2">
          <button type="button" onClick={() => setShowIngredients(true)} className="btn-ghost flex h-11 shrink-0 items-center gap-2 font-display text-[13px]"><Icon name="list" size={19} />Ingredientes</button>
          <TimerTray api={timers} />
          <button type="button" aria-label="Agregar temporizador" onClick={() => setNewTimer(true)} className="btn-outline ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-line"><Icon name="add" size={19} /></button>
        </div>
      </footer> : null}

      <Drawer.Backdrop isOpen={showIngredients} onOpenChange={setShowIngredients} variant="opaque" className="bg-ink/40 [--focus:var(--color-ink)]">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="mx-auto max-h-[80dvh] w-full max-w-xl bg-canvas! px-5 pb-safe text-ink shadow-none [&_:focus-visible]:outline-ink">
            <Drawer.Handle />
            <Drawer.CloseTrigger aria-label="Cerrar ingredientes" className="btn-ghost text-ink shadow-none"><Icon name="close" size={20} /></Drawer.CloseTrigger>
            <Drawer.Header><Drawer.Heading className="font-display text-2xl">Ingredientes</Drawer.Heading><p className="text-xs text-ink-muted">Para {servings}</p></Drawer.Header>
            <Drawer.Body>
              <ul>{ingredients.map((ingredient, ingredientIndex) => <li key={ingredientIndex} className={cn("flex items-center justify-between gap-3 border-b border-line py-3.5 last:border-b-0", ingredient.removed && "text-ink-faint line-through")}>
                <span className="font-display text-[15px]">{ingredient.name}</span><span className="text-sm text-ink-muted">{ingredient.amount}</span>
              </li>)}</ul>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      {newTimer ? <NewTimerSheet defaultLabel={finished ? title : `Paso ${index + 1}`} onCreate={timers.add} onClose={() => setNewTimer(false)} /> : null}
      <Drawer.Backdrop isOpen={showVideo} onOpenChange={setShowVideo} className="[--focus:var(--color-ink)]">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="mx-auto w-full max-w-xl bg-canvas px-5 pb-safe text-ink shadow-none [&_:focus-visible]:outline-ink">
            <Drawer.Handle />
            <Drawer.CloseTrigger aria-label="Cerrar video" className="btn-ghost text-ink shadow-none"><Icon name="close" size={20} /></Drawer.CloseTrigger>
            <Drawer.Header><Drawer.Heading className="font-display text-xl">Video · paso {String(index + 1).padStart(2, "0")}</Drawer.Heading></Drawer.Header>
            <Drawer.Body>{showVideo && videoId ? <div className="relative aspect-video overflow-hidden rounded-xl bg-ink"><StepVideo platform={platform} videoId={videoId} startSeconds={step.video_start_seconds} title={title} /></div> : null}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </main>
  );
}
