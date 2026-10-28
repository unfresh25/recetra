"use client";

import type { ReactNode } from "react";
import { DrawablyCheckbox } from "@/components/ui/drawably";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * BitePal-style option row, flat: icon at the left, label and description, hand-drawn checkbox
 * at the right. The whole row is a label, so tapping anywhere toggles the checkbox.
 */
export function OptionRow({
  selected,
  onToggle,
  icon,
  media,
  label,
  description,
  disabled,
  className,
}: {
  selected: boolean;
  onToggle: () => void;
  icon?: IconName;
  media?: ReactNode;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      aria-disabled={(disabled && !selected) || undefined}
      className={cn(
        "btn-ghost flex min-h-16 items-center gap-4 py-3",
        disabled && !selected && "opacity-40",
        className,
      )}
    >
      {media ??
        (icon ? (
          <span className={cn("flex size-10 shrink-0 items-center justify-center", selected ? "text-brand" : "text-ink")}>
            <Icon name={icon} size={26} strokeWidth={1.6} />
          </span>
        ) : null)}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold leading-tight">{label}</span>
        {description ? <span className="block text-sm text-ink-muted">{description}</span> : null}
      </span>
      <DrawablyCheckbox
        checked={selected}
        disabled={disabled && !selected}
        onChange={onToggle}
        aria-label={label}
        stroke={selected ? "var(--color-brand)" : "var(--color-ink-faint)"}
        fill="var(--color-brand)"
      />
    </label>
  );
}
