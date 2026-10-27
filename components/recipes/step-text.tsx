"use client";

import { Icon } from "@/components/ui/icon";
import { stepTokenIcon, type StepToken } from "@/lib/recipes/step-tokens";
import { cn } from "@/lib/utils/cn";

export function StepText({ tokens, onTime, video = false }: { tokens: StepToken[]; onTime: (seconds: number) => void; video?: boolean }) {
  return <p className={cn("font-display", video ? "pointer-events-none text-[22px] leading-[1.25] text-white" : "text-[25px] leading-[1.32]")}>
    {tokens.map((token, index) => {
      const icon = stepTokenIcon(token);
      if (!icon) return <span key={index}>{token.text}</span>;
      const content = <><Icon name={icon} size={21} className={cn("mr-1 inline-block -translate-y-0.5", video && "text-white", !video && token.kind === "tool" && "text-ink-muted")} />{token.text}</>;
      return token.kind === "time" && !video ? <button key={index} type="button" onClick={() => onTime(token.seconds)} aria-label={`Crear temporizador de ${token.text}`} className="link-text inline text-left text-ink underline decoration-2 decoration-dotted underline-offset-[6px]">{content}</button> : <span key={index} className={cn(video && (token.kind === "time" || token.kind === "temperature") && "text-white/60")}>{content}</span>;
    })}
  </p>;
}
