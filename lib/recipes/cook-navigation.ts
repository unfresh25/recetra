type Point = { x: number; y: number };

/** Ignore taps, short drags and horizontal ingredient-card scrolling. */
export function swipeDirection(start: Point, end: Point): "next" | "previous" | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dy) < 60 || Math.abs(dy) <= Math.abs(dx) * 1.25) return null;
  return dy < 0 ? "next" : "previous";
}
