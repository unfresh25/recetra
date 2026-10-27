type VideoStep = { video_start_seconds: number | null };
export type PipCorner = "left" | "right";

/** Open, missing or invalid segments have no measurable playback progress. */
export function segmentProgress(seconds: number | null, start: number | null, end: number | null): number {
  if (seconds === null || start === null || end === null || ![seconds, start, end].every(Number.isFinite) || start < 0 || end <= start) return 0;
  return Math.max(0, Math.min(1, (seconds - start) / (end - start)));
}

export const TIKTOK_FRAME = { width: 390, height: 390 * 16 / 9, barHeight: 70 } as const;

/** Cover, then zoom about the bottom-left corner to retain TikTok's pause/mute bar. */
export function tiktokLayout(width: number, height: number, zoom = 1.18) {
  const frameWidth = Math.max(width, height * 9 / 16) * zoom;
  return {
    width: frameWidth,
    height: frameWidth * 16 / 9,
    left: 0,
    bottom: 0,
    // Real iframe sizing leaves native controls at their logical CSS size.
    barHeight: TIKTOK_FRAME.barHeight,
  };
}

/** Horizontal gestures navigate; vertical gestures remain available for long text. */
export function videoSwipeDirection(start: { x: number; y: number }, end: { x: number; y: number }): "next" | "previous" | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.25) return null;
  return dx < 0 ? "next" : "previous";
}

export type PlayerCommand = { type: "play" | "pause" | "mute" | "unMute" } | { type: "seekTo"; value: number };

/** YouTube waits for navigation AND the player's handshake, in either order. */
export class CookPlayerController {
  private hasLoaded = false;
  private hasPlayerReady = false;
  private nativeControls = false;
  private disposed = false;
  private queue: PlayerCommand[] = [];
  private readyTimeout: ReturnType<typeof setTimeout>;
  private playTimeout: ReturnType<typeof setTimeout> | undefined;
  playing = false;

  constructor(private callbacks: {
    send: (command: PlayerCommand) => void;
    onPlayingChange: (playing: boolean) => void;
    onFallback: () => void;
  }, nativeControls = false) {
    this.nativeControls = nativeControls;
    this.readyTimeout = setTimeout(() => this.fallback(), 5_000);
  }

  get ready() { return !this.disposed && this.hasLoaded && this.hasPlayerReady; }

  loaded() {
    if (this.disposed) return;
    this.hasLoaded = true;
    this.flush();
  }

  playerReady() {
    if (this.disposed) return;
    this.hasPlayerReady = true;
    this.flush();
  }

  command(command: PlayerCommand) {
    if (this.disposed) return;
    this.queue.push(command);
    this.flush();
  }

  private flush() {
    if (!this.ready) return;
    clearTimeout(this.readyTimeout);
    while (this.queue.length && this.ready) {
      const command = this.queue.shift()!;
      if (command.type === "pause") {
        clearTimeout(this.playTimeout);
        this.playTimeout = undefined;
      } else if (command.type === "play" && !this.playing && !this.nativeControls && this.playTimeout === undefined) {
        // Repeated play requests must not postpone the acknowledgement deadline.
        this.playTimeout = setTimeout(() => this.fallback(), 2_000);
      }
      this.callbacks.send(command);
    }
  }

  stateChanged(state: number) {
    if (this.disposed) return;
    // YouTube: 3 = buffering, 5 = cued.
    this.playing = state === 1;
    if (this.playing) {
      clearTimeout(this.playTimeout);
      this.playTimeout = undefined;
    }
    this.callbacks.onPlayingChange(this.playing);
  }

  fallback() {
    if (this.disposed || this.nativeControls) return;
    this.nativeControls = true;
    clearTimeout(this.readyTimeout);
    clearTimeout(this.playTimeout);
    this.playTimeout = undefined;
    this.hasLoaded = false;
    this.hasPlayerReady = false;
    this.queue = [];
    this.playing = false;
    this.callbacks.onPlayingChange(false);
    this.callbacks.onFallback();
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.readyTimeout);
    clearTimeout(this.playTimeout);
    this.queue = [];
  }
}

export function tiktokPlayerUrl(videoId: string, { autoplay = true, loop = true, fullscreen = false, timestamp = false }: { autoplay?: boolean; loop?: boolean; fullscreen?: boolean; timestamp?: boolean } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0", controls: "1", progress_bar: "1",
    play_button: "1", volume_control: "1", fullscreen_button: fullscreen ? "1" : "0",
    timestamp: timestamp ? "1" : "0", music_info: "0", description: "0", loop: loop ? "1" : "0", rel: "0", closed_caption_button: "0",
  });
  return `https://www.tiktok.com/player/v1/${videoId}?${params}`;
}

/** Null timestamps never displace a timed step; equal timestamps select the later step. */
export function stepFromTime(steps: readonly VideoStep[], seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  let index: number | null = null;
  let latest = -1;
  steps.forEach((step, candidate) => {
    const start = step.video_start_seconds;
    if (start !== null && start >= 0 && start <= seconds && start >= latest) {
      latest = start;
      index = candidate;
    }
  });
  return index;
}

/** Skip missing/duplicate/backward timestamps so a segment always has positive length. */
export function segmentEnd(steps: readonly VideoStep[], index: number): number | null {
  const start = steps[index]?.video_start_seconds;
  if (start === null || start === undefined || start < 0) return null;
  return steps.slice(index + 1).find((step) => step.video_start_seconds !== null && step.video_start_seconds > start)?.video_start_seconds ?? null;
}

export function pipSnapCorner(centerX: number, viewportWidth: number): PipCorner {
  return centerX < viewportWidth / 2 ? "left" : "right";
}

/** Horizontal-only dragging keeps the player in its reserved row, clear of controls. */
export function pipDragX(left: number, deltaX: number, width: number, viewportWidth: number): number {
  return Math.max(0, Math.min(left + deltaX, Math.max(0, viewportWidth - width))) - left;
}
