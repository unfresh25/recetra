"use client";

import { useOptimistic, useState, useTransition, type MouseEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { toggleReaction } from "@/lib/plan/actions";
import { formatLikeCount } from "@/lib/recipes/likes";
import { cn } from "@/lib/utils/cn";

export function LikePill({ liked, likes, pending, onClick, className, recipeTitle }: {
  liked: boolean;
  likes: number;
  pending?: boolean;
  onClick: () => void;
  className?: string;
  recipeTitle?: string;
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  }
  return (
    <button
      type="button"
      aria-label={`${liked ? "Quitar me gusta" : "Me gusta"}${recipeTitle ? `: ${recipeTitle}` : ""}`}
      aria-pressed={liked}
      disabled={pending}
      onClick={handleClick}
      className={cn("inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-full bg-canvas/90 px-2.5 text-[12px] font-medium text-ink tabular-nums backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink", className)}
    >
      <Icon name="heart" size={18} className={liked ? "[&_path]:fill-current" : undefined} />
      {likes > 0 ? <span>{formatLikeCount(likes)}</span> : null}
    </button>
  );
}

export function LikeButton({ recipeId, likes, likedByMe, recipeTitle }: { recipeId: string; likes: number; likedByMe: boolean; recipeTitle?: string }) {
  const [optimistic, setOptimistic] = useOptimistic({ liked: likedByMe, likes }, (state) => ({
    liked: !state.liked,
    likes: Math.max(0, state.likes + (state.liked ? -1 : 1)),
  }));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  function toggle() {
    setError(false);
    startTransition(async () => {
      setOptimistic(null);
      try {
        await toggleReaction(recipeId, "favorite");
      } catch {
        setError(true);
      }
    });
  }
  return (
    <>
      <LikePill liked={optimistic.liked} likes={optimistic.likes} pending={pending} onClick={toggle} recipeTitle={recipeTitle} />
      {error ? <span role="alert" className="absolute right-0 bottom-full mb-1 w-44 rounded-lg bg-canvas p-2 text-xs text-ink">No pudimos guardar tu me gusta. Intenta de nuevo.</span> : null}
    </>
  );
}
