type VideoStep = { video_start_seconds: number | null };
export type PipCorner = "left" | "right";

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
