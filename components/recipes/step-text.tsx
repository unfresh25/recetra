"use client";

import { Icon } from "@/components/ui/icon";
import { stepTokenIcon, type StepToken } from "@/lib/recipes/step-tokens";
import { cn } from "@/lib/utils/cn";

export function StepText({ tokens, onTime }: { tokens: StepToken[]; onTime: (seconds: number) => void }) {
  return <p className="font-display text-[25px] leading-[1.32]">
    {tokens.map((token, index) => {
      const icon = stepTokenIcon(token);
      if (!icon) return <span key={index}>{token.text}</span>;
      const content = <><Icon name={icon} size={21} className={cn("mr-1 inline-block -translate-y-0.5", token.kind === "tool" && "text-ink-muted")} />{token.text}</>;
      return token.kind === "time" ? <button key={index} type="button" onClick={() => onTime(token.seconds)} aria-label={`Crear temporizador de ${token.text}`} className="link-text inline text-left text-ink underline decoration-2 decoration-dotted underline-offset-[6px]">{content}</button> : <span key={index}>{content}</span>;
    })}
  </p>;
}
