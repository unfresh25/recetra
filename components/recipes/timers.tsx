"use client";

import { Drawer } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatClock } from "@/lib/recipes/timer-clock";
import { formatDuration } from "@/lib/recipes/step-tokens";

export type Timer = {
  id: string;
  label: string;
  duration: number; // seconds
  /** Remaining seconds while paused; null while running. */
  pausedAt: number | null;
  /** Epoch ms when it ends, while running. */
  endsAt: number | null;
};

function remainingOf(t: Timer, now: number) {
  return t.endsAt !== null ? (t.endsAt - now) / 1000 : (t.pausedAt ?? t.duration);
}

/** A short bell made with WebAudio, so no sound file is needed. */
function ring() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.32);
    });
    setTimeout(() => void ctx.close(), 1400);
  } catch {
    // Audio unavailable: vibration still fires.
  }
  navigator.vibrate?.([300, 150, 300]);
}

/** Timers live with the cook-mode screen: several can run at once (one per step or more). */
export function useTimers() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const rung = useRef(new Set<string>());

  useEffect(() => {
    if (!timers.some((t) => t.endsAt !== null)) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timers]);

  useEffect(() => {
    for (const t of timers) {
      if (t.endsAt !== null && t.endsAt <= now && !rung.current.has(t.id)) {
        rung.current.add(t.id);
        ring();
      }
    }
  }, [now, timers]);

  const add = useCallback((label: string, duration: number, running = false) => {
    const now = Date.now();
    setNow(now);
    setTimers((ts) => [...ts, { id: crypto.randomUUID(), label, duration, pausedAt: running ? null : duration, endsAt: running ? now + duration * 1000 : null }]);
  }, []);
  const update = (id: string, fn: (t: Timer) => Timer) => setTimers((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  return {
    timers,
    now,
    add,
    play: (id: string) => {
      const now = Date.now();
      setNow(now);
      rung.current.delete(id);
      update(id, (t) => ({ ...t, endsAt: now + (t.pausedAt ?? t.duration) * 1000, pausedAt: null }));
    },
    pause: (id: string) => update(id, (t) => ({ ...t, pausedAt: Math.max(0, remainingOf(t, Date.now())), endsAt: null })),
    plusMinute: (id: string) => {
      rung.current.delete(id);
      update(id, (t) =>
        t.endsAt !== null
          ? { ...t, endsAt: Math.max(t.endsAt, Date.now()) + 60_000, duration: t.duration + 60 }
          : { ...t, pausedAt: (t.pausedAt ?? 0) + 60, duration: t.duration + 60 },
      );
    },
    reset: (id: string) => {
      rung.current.delete(id);
      update(id, (t) => ({ ...t, endsAt: null, pausedAt: t.duration }));
    },
    remove: (id: string) => setTimers((ts) => ts.filter((t) => t.id !== id)),
  };
}

export type TimersApi = ReturnType<typeof useTimers>;

/** Compact countdowns stay in the dock across steps. */
export function TimerTray({ api, video = false }: { api: TimersApi; video?: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = api.timers.find((timer) => timer.id === selectedId);
  const finished = api.timers.filter((timer) => remainingOf(timer, api.now) <= 0);
  return <>
    <p role="status" className="sr-only">{finished.map((timer) => `${timer.label}: listo`).join(". ")}</p>
    <ul className={`${video ? "" : "ml-auto"} flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`} aria-label="Temporizadores">
      {api.timers.map((timer) => {
        const remaining = remainingOf(timer, api.now);
        const done = remaining <= 0;
        const running = timer.endsAt !== null && !done;
        return <li key={timer.id} role="timer" aria-label={`${timer.label}: ${done ? "listo" : formatClock(remaining)}`} className={`flex h-10 shrink-0 items-center rounded-full ${video ? "bg-white text-ink" : "bg-ink text-white"}`}>
          <button type="button" aria-label={`${done ? "Ver" : running ? "Pausar" : "Iniciar"} temporizador ${timer.label}`} onClick={() => done ? setSelectedId(timer.id) : running ? api.pause(timer.id) : api.play(timer.id)} className={`${video ? "btn-ghost" : "btn-ink"} flex h-10 rounded-l-full items-center gap-1.5 pl-3 pr-1 font-display text-xs tabular`}>
            <Icon name={done ? "check" : "timer"} size={16} />{done ? "Listo" : formatClock(remaining)}
            {!running && !done ? <Icon name="pause" size={12} /> : null}
          </button>
          <button type="button" aria-label={`Opciones del temporizador ${timer.label}`} onClick={() => setSelectedId(timer.id)} className={`${video ? "btn-ghost" : "btn-ink"} flex h-10 w-7 rounded-r-full items-center justify-center pr-1`}><Icon name="arrow-up" size={13} /></button>
        </li>;
      })}
    </ul>
    <Drawer.Backdrop isOpen={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }} className="[--focus:var(--color-ink)]">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="mx-auto w-full max-w-xl bg-canvas px-5 pb-safe text-ink shadow-none [&_:focus-visible]:outline-ink">
          <Drawer.Handle />
          <Drawer.CloseTrigger aria-label="Cerrar temporizador" className="btn-ghost text-ink shadow-none"><Icon name="close" size={20} /></Drawer.CloseTrigger>
          <Drawer.Header><Drawer.Heading className="font-display text-2xl">Temporizador</Drawer.Heading></Drawer.Header>
          <Drawer.Body>{selected ? <div className="flex flex-col items-center gap-5">
            <p className="text-sm text-ink-muted">{selected.label}</p>
            <p className="font-display text-6xl tabular">{formatClock(remainingOf(selected, api.now))}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="secondary" className="border-line shadow-none" onPress={() => api.plusMinute(selected.id)}>+1 min</Button>
              <Button size="sm" variant="secondary" className="border-line shadow-none" onPress={() => api.reset(selected.id)}><Icon name="timer-reset" size={17} />Reiniciar</Button>
              <Button size="sm" variant="secondary" className="border-line shadow-none" onPress={() => { api.remove(selected.id); setSelectedId(null); }}><Icon name="close" size={17} />Quitar</Button>
            </div>
            <Button block className="bg-ink text-white shadow-none" onPress={() => selected.endsAt !== null && remainingOf(selected, api.now) > 0 ? api.pause(selected.id) : api.play(selected.id)}>
              <Icon name={selected.endsAt !== null && remainingOf(selected, api.now) > 0 ? "pause" : "play"} size={20} />
              {selected.endsAt !== null && remainingOf(selected, api.now) > 0 ? "Pausar" : "Iniciar"}
            </Button>
          </div> : null}</Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  </>;
}

const PRESETS = [1, 3, 5, 10, 15, 20, 30, 45, 60];

export function NewTimerSheet({ defaultLabel, onCreate, onClose }: {
  defaultLabel: string;
  onCreate: (label: string, seconds: number) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(5);
  return (
    <Drawer.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }} className="[--focus:var(--color-ink)]">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="mx-auto w-full max-w-xl bg-canvas px-5 pb-safe text-ink shadow-none [&_:focus-visible]:outline-ink">
          <Drawer.Handle />
          <Drawer.CloseTrigger aria-label="Cerrar nuevo temporizador" className="btn-ghost text-ink shadow-none"><Icon name="close" size={20} /></Drawer.CloseTrigger>
          <Drawer.Header><Drawer.Heading className="font-display text-2xl">Nuevo temporizador</Drawer.Heading></Drawer.Header>
          <Drawer.Body>
            <p className="text-sm text-ink-muted">{defaultLabel}</p>
            <div className="my-5 flex items-center justify-center gap-6">
              <button type="button" aria-label="Menos un minuto" disabled={minutes <= 1} onClick={() => setMinutes((value) => value - 1)} className="btn-ghost flex size-12 items-center justify-center disabled:text-ink-faint"><Icon name="minus" size={26} /></button>
              <span className="w-44 text-center font-display text-[64px] leading-none tabular">{formatClock(minutes * 60)}</span>
              <button type="button" aria-label="Más un minuto" disabled={minutes >= 600} onClick={() => setMinutes((value) => value + 1)} className="btn-ghost flex size-12 items-center justify-center disabled:text-ink-faint"><Icon name="add" size={26} /></button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((value) => <button key={value} type="button" aria-pressed={minutes === value} onClick={() => setMinutes(value)} className={`min-h-10 rounded-full border px-3 font-display text-sm ${minutes === value ? "btn-ink border-ink bg-ink text-white" : "btn-outline border-line text-ink"}`}>{formatDuration(value * 60)}</button>)}
            </div>
          </Drawer.Body>
          <Drawer.Footer className="flex-col">
            <Button block className="bg-ink text-white shadow-none" onPress={() => { onCreate(defaultLabel, minutes * 60); onClose(); }}>Crear temporizador</Button>
            <button type="button" onClick={onClose} className="btn-ghost h-11 w-full font-display text-sm text-ink-muted">Cancelar</button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
