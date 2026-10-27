"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import { pipDragX, pipSnapCorner, type PipCorner } from "@/lib/recipes/cook-video";
import { formatDuration, type StepToken } from "@/lib/recipes/step-tokens";
import type { Enums } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils/cn";
import { StepText } from "./step-text";
import { StepVideo, type StepVideoHandle } from "./step-video";
import { TimerTray, type TimersApi } from "./timers";

export function CookVideo({ platform, videoId, title, startSeconds, segmentEnd, tokens, expanded, hidden, playerRef, timers, onExpandedChange, onHide, onError, onTime, onIngredients, onTimer }: {
  platform: Enums<"source_platform">;
  videoId: string;
  title: string;
  startSeconds: number | null;
  segmentEnd: number | null;
  tokens: StepToken[];
  expanded: boolean;
  hidden: boolean;
  playerRef: RefObject<StepVideoHandle | null>;
  timers: TimersApi;
  onExpandedChange: (expanded: boolean) => void;
  onHide: () => void;
  onError: () => void;
  onTime: (seconds: number) => void;
  onIngredients: () => void;
  onTimer: (seconds: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const before = useRef<{ rect: DOMRect; radius: string } | null>(null);
  const animation = useRef<Animation | null>(null);
  const [corner, setCorner] = useState<{ side: PipCorner }>({ side: "right" });
  const drag = useRef<{ id: number; x: number; left: number; width: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const wasExpanded = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [feedback, setFeedback] = useState<{ icon: "play" | "pause"; visible: boolean }>({ icon: "play", visible: false });
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => () => {
    clearTimeout(feedbackTimeout.current);
    setFeedback((previous) => ({ ...previous, visible: false }));
  }, [expanded, hidden]);

  function togglePlayback() {
    const next = playerRef.current?.togglePlayback();
    if (next === undefined) return;
    clearTimeout(feedbackTimeout.current);
    setFeedback({ icon: next ? "play" : "pause", visible: true });
    feedbackTimeout.current = setTimeout(() => {
      setFeedback((previous) => ({ ...previous, visible: false }));
    }, 700);
  }

  function captureFrame() {
    const element = frame.current;
    return element ? { rect: element.getBoundingClientRect(), radius: getComputedStyle(element).borderRadius } : null;
  }

  function changeView(next: boolean) {
    before.current = captureFrame();
    playerRef.current?.activate(next);
    onExpandedChange(next);
  }

  // FLIP the live fixed container. The iframe is never moved, portaled, keyed or replaced.
  useLayoutEffect(() => {
    const element = frame.current;
    const previous = before.current;
    before.current = null;
    if (!element || !previous || hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = element.getBoundingClientRect();
    animation.current = element.animate([
      { transformOrigin: "top left", transform: `translate(${previous.rect.left - next.left}px, ${previous.rect.top - next.top}px) scale(${previous.rect.width / next.width}, ${previous.rect.height / next.height})`, borderRadius: previous.radius },
      { transformOrigin: "top left", transform: "none", borderRadius: expanded ? "0px" : "16px" },
    ], { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    return () => { animation.current?.cancel(); };
  }, [expanded, corner, hidden]);

  useEffect(() => {
    if (expanded) closeButton.current?.focus({ preventScroll: true });
    else if (wasExpanded.current) expandButton.current?.focus({ preventScroll: true });
    wasExpanded.current = expanded;
  }, [expanded]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    animation.current?.cancel();
    const rect = frame.current!.getBoundingClientRect();
    drag.current = { id: event.pointerId, x: event.clientX, left: rect.left, width: rect.width, moved: false };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || !frame.current) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 6) start.moved = true;
    if (start.moved) frame.current.style.transform = `translateX(${pipDragX(start.left, dx, start.width, window.innerWidth)}px)`;
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || !frame.current) return;
    drag.current = null;
    suppressClick.current = start.moved || cancelled;
    const rect = frame.current.getBoundingClientRect();
    before.current = captureFrame();
    frame.current.style.transform = "";
    setCorner({ side: cancelled ? corner.side : pipSnapCorner(rect.left + rect.width / 2, window.innerWidth) });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <div ref={frame} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "Modo video" : "Video en miniatura"} aria-hidden={hidden || undefined} inert={hidden} data-expanded={expanded} data-corner={corner.side} data-portrait={platform !== "youtube"} className={cn("cook-video-frame", hidden && "invisible pointer-events-none")} onKeyDown={(event) => {
    // Drawer portals bubble through React too; leave their keyboard handling to HeroUI.
    if (!expanded || !frame.current?.contains(event.target as Node)) return;
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      changeView(false);
    }
    if (event.key === "Tab") {
      const controls = Array.from(frame.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')).filter((element) => element.tabIndex >= 0 && element.offsetParent !== null && !element.closest('[inert]'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <StepVideo ref={playerRef} platform={platform} videoId={videoId} title={title} startSeconds={startSeconds} segmentStart={startSeconds} segmentEnd={segmentEnd} expanded={expanded} hidden={hidden} onError={onError} onTime={onTime} onPlayingChange={setPlaying} />
    <button ref={expandButton} type="button" aria-label="Abrir modo video" tabIndex={expanded ? -1 : 0} aria-hidden={expanded} className={cn("absolute inset-0 z-10 touch-none", expanded && "pointer-events-none invisible")} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onClick={() => {
      if (suppressClick.current) { suppressClick.current = false; return; }
      changeView(true);
    }} />
    {expanded ? <>
      <button type="button" aria-label={playing ? "Pausar video" : "Reproducir video"} onClick={togglePlayback} className="absolute inset-0 z-10 flex items-center justify-center bg-transparent text-white focus-visible:outline-white">
        <span aria-hidden className={cn("cook-video-feedback pointer-events-none flex size-14 items-center justify-center rounded-full bg-black/40 text-white", feedback.visible ? "opacity-100" : "opacity-0")}><Icon name={feedback.icon} size={28} /></span>
      </button>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black via-black/90 to-transparent" />
    </> : null}
    {!expanded ? <button type="button" aria-label="Ocultar video" onClick={onHide} className="absolute top-1 right-1 z-30 flex size-7 items-center justify-center rounded-full bg-black/65 text-white"><Icon name="close" size={15} /></button> : null}
    <button ref={closeButton} type="button" aria-label="Volver a los pasos" aria-hidden={!expanded} inert={!expanded} onClick={() => changeView(false)} className={cn("absolute right-4 top-[max(env(safe-area-inset-top),0.75rem)] z-30 flex size-10 items-center justify-center rounded-full bg-white/12 text-white focus-visible:outline-white", !expanded && "invisible pointer-events-none")}><Icon name="close" size={22} /></button>
    <div aria-hidden={!expanded} inert={!expanded} className="cook-video-overlay absolute inset-0 z-20 text-white [&_:focus-visible]:outline-white">
      <div className="absolute top-0 left-0 right-16 flex max-h-24 items-start overflow-x-auto px-4 pt-safe">
        <TimerTray api={timers} video />
      </div>
      <div className="cook-video-caption absolute inset-x-0 bottom-0 flex max-h-[60%] flex-col gap-5 overflow-y-auto bg-gradient-to-t from-black via-black/75 to-transparent px-5 pt-16 pb-safe">
        <p className="sr-only" aria-live="polite">{tokens.map((token) => token.text).join("")}</p>
        <StepText tokens={tokens} onTime={onTimer} video />
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tokens.filter((token) => token.kind === "time").map((token, index) => <button key={index} type="button" onClick={() => onTimer(token.seconds)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 font-display text-[13px] text-ink"><Icon name="timer" size={18} />{formatDuration(token.seconds)}</button>)}
          <button type="button" onClick={onIngredients} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white/12 px-4 font-display text-[13px] text-white"><Icon name="list" size={18} />Ingredientes</button>
          <Link href="/ask" className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white/12 px-4 font-display text-[13px] text-white"><Icon name="chef-hat" size={18} />Pregúntale a Carmy</Link>
        </div>
      </div>
    </div>
  </div>;
}
