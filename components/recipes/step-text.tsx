"use client";

import { Icon } from "@/components/ui/icon";
import { stepTokenIcon, type StepToken } from "@/lib/recipes/step-tokens";
import { cn } from "@/lib/utils/cn";

export function StepText({ tokens, onTime, video = false }: { tokens: StepToken[]; onTime: (seconds: number) => void; video?: boolean }) {
  return <p className={cn("font-display leading-[1.32]", video ? "text-[20px] text-white" : "text-[25px]")}>
    {tokens.map((token, index) => {
      const icon = stepTokenIcon(token);
      if (!icon) return <span key={index}>{token.text}</span>;
      const content = <><Icon name={icon} size={video ? 19 : 21} className={cn("mr-1 inline-block -translate-y-0.5", !video && token.kind === "tool" && "text-ink-muted")} />{token.text}</>;
      return token.kind === "time" && !video ? <button key={index} type="button" onClick={() => onTime(token.seconds)} aria-label={`Crear temporizador de ${token.text}`} className="link-text inline text-left text-ink underline decoration-2 decoration-dotted underline-offset-[6px]">{content}</button> : <span key={index}>{content}</span>;
    })}
  </p>;
}
