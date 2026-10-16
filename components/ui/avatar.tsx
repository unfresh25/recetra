import { cn } from "@/lib/utils/cn";

const accents = {
  coral: "bg-coral-soft text-coral",
  teal: "bg-teal-soft text-teal",
} as const;

export type Accent = keyof typeof accents;

export function Avatar({
  name,
  accent,
  size = 40,
  className,
}: {
  name: string;
  accent: Accent;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold",
        accents[accent],
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
