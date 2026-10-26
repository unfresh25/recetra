"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { formatDuration } from "@/lib/recipes/step-tokens";
import { cn } from "@/lib/utils/cn";

export type Timer = {
  id: string;
  label: string;
  duration: number; // seconds
  /** Remaining seconds while paused; null while running. */
  pausedAt: number | null;
  /** Epoch ms when it ends, while running. */
  endsAt: number | null;
};

export function formatClock(total: number) {
  const s = Math.max(0, Math.ceil(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

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

  const add = useCallback((label: string, duration: number) => {
    setTimers((ts) => [...ts, { id: crypto.randomUUID(), label, duration, pausedAt: duration, endsAt: null }]);
  }, []);
  const update = (id: string, fn: (t: Timer) => Timer) => setTimers((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  return {
    timers,
    now,
    add,
    play: (id: string) => update(id, (t) => ({ ...t, endsAt: Date.now() + (t.pausedAt ?? t.duration) * 1000, pausedAt: null })),
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

type TimersApi = ReturnType<typeof useTimers>;

/** Running timers stacked above the controls (Hevy-style bar: progress, -/+ and play/pause). */
export function TimerTray({ api }: { api: TimersApi }) {
  if (!api.timers.length) return null;
  return (
    <ul className="flex flex-col gap-2 px-5 pb-3" aria-label="Temporizadores">
      {api.timers.map((t) => {
        const remaining = remainingOf(t, api.now);
        const done = remaining <= 0;
        const running = t.endsAt !== null && !done;
        const progress = Math.min(1, Math.max(0, 1 - remaining / t.duration));
        return (
          <li
            key={t.id}
            role="timer"
            aria-label={`${t.label}: ${done ? "listo" : formatClock(remaining)}`}
            className={cn("relative overflow-hidden rounded-full text-white", done ? "animate-pulse bg-brand" : "bg-ink")}
          >
            <span className="absolute inset-y-0 left-0 bg-white/12" style={{ width: `${progress * 100}%` }} aria-hidden />
            <div className="relative flex h-14 items-center gap-2 pl-5 pr-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-white/70">{t.label}</span>
                <span className="block font-condensed text-[22px] font-extrabold leading-none tabular">
                  {done ? "¡Listo!" : formatClock(remaining)}
                </span>
              </span>
              <button type="button" onClick={() => api.plusMinute(t.id)} className="h-10 px-2 text-sm font-semibold">
                +1 min
              </button>
              {done ? (
                <button type="button" aria-label="Reiniciar" onClick={() => api.reset(t.id)} className="flex size-10 items-center justify-center">
                  <Icon name="timer-reset" size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={running ? "Pausar" : "Iniciar"}
                  onClick={() => (running ? api.pause(t.id) : api.play(t.id))}
                  className="flex size-10 items-center justify-center rounded-full bg-white text-ink"
                >
                  <Icon name={running ? "pause" : "play"} size={20} />
                </button>
              )}
              <button type="button" aria-label="Quitar temporizador" onClick={() => api.remove(t.id)} className="flex size-10 items-center justify-center text-white/70">
                <Icon name="close" size={18} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const PRESETS = [1, 3, 5, 10, 15, 20, 30, 45, 60];

/** Create a timer for the current step (Crouton-style: big readout, presets, fine adjust). */
export function NewTimerSheet({
  defaultLabel,
  onCreate,
  onClose,
}: {
  defaultLabel: string;
  onCreate: (label: string, seconds: number) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(5);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Nuevo temporizador"
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-canvas px-5 pt-3 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
        <p className="text-sm text-ink-muted">{defaultLabel}</p>
        <div className="my-4 flex items-center justify-center gap-6">
          <button type="button" aria-label="Menos un minuto" disabled={minutes <= 1} onClick={() => setMinutes((m) => m - 1)} className="flex size-12 items-center justify-center disabled:text-ink-faint">
            <Icon name="minus" size={28} />
          </button>
          <span className="w-44 text-center font-condensed text-[72px] font-extrabold leading-none text-brand tabular">
            {formatClock(minutes * 60)}
          </span>
          <button type="button" aria-label="Más un minuto" disabled={minutes >= 600} onClick={() => setMinutes((m) => m + 1)} className="flex size-12 items-center justify-center disabled:text-ink-faint">
            <Icon name="add" size={28} />
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((m) => (
            <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)} className="h-9 px-3 text-sm">
              {formatDuration(m * 60)}
            </Chip>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button
            className="min-w-48"
            onClick={() => {
              onCreate(defaultLabel, minutes * 60);
              onClose();
            }}
          >
            Crear temporizador
          </Button>
        </div>
        <button type="button" onClick={onClose} className="mt-2 h-12 w-full font-semibold text-ink-muted">
          Cancelar
        </button>
      </div>
    </div>
  );
}
