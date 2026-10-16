import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./illustration";

export function EmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration: IllustrationName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <Illustration name={illustration} size={168} />
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-[15px] text-ink-muted">{description}</p>
      {action}
    </div>
  );
}
