"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { setCover } from "@/lib/recipes/actions";
import { createClient } from "@/lib/supabase/client";

async function toWebp(file: File, size: number, crop: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = crop ? Math.max(size / bitmap.width, size / bitmap.height) : Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const w = crop ? size : Math.round(bitmap.width * scale);
  const h = crop ? size : Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
}

/** Lets the household replace the recipe cover with a photo from the gallery or camera, or restore the original. */
export function CoverEditor({
  recipeId,
  householdId,
  hasCustomCover,
}: {
  recipeId: string;
  householdId: string;
  hasCustomCover: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function upload(file: File) {
    setError(undefined);
    startTransition(async () => {
      try {
        const [full, thumb] = await Promise.all([toWebp(file, 1200, false), toWebp(file, 400, true)]);
        const base = `covers/${householdId}/${recipeId}-${Date.now()}`;
        const bucket = createClient().storage.from("recipe-images");
        const [a, b] = await Promise.all([
          bucket.upload(`${base}.webp`, full, { contentType: "image/webp" }),
          bucket.upload(`${base}-thumb.webp`, thumb, { contentType: "image/webp" }),
        ]);
        if (a.error || b.error) throw a.error ?? b.error;
        const result = await setCover(recipeId, `${base}.webp`);
        if (result.error) setError(result.error);
        else setOpen(false);
      } catch {
        setError("No pudimos subir la foto. Intenta con otra.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cambiar portada"
        className="flex size-[38px] items-center justify-center rounded-full bg-canvas/90 text-ink"
      >
        {pending ? <span className="size-5 animate-spin rounded-full border-2 border-ink border-r-transparent" /> : <Icon name="pencil" size={18} />}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Cambiar portada"
            className="mx-auto w-full max-w-xl rounded-t-[28px] bg-canvas px-5 pt-3 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line" />
            <p className="mb-3 font-display text-xl font-bold">Portada de la receta</p>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={pending} onClick={() => input.current?.click()} className="flex items-center gap-3 border-b border-line py-4 text-left font-display">
                <Icon name="image" className="text-ink" /> Elegir foto o tomar una
              </button>
              {hasCustomCover ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await setCover(recipeId, null);
                      setOpen(false);
                    })
                  }
                  className="flex items-center gap-3 border-b border-line py-4 text-left font-display"
                >
                  <Icon name="refresh" className="text-ink" /> Volver a la imagen del video
                </button>
              ) : null}
              {error ? <p role="alert" className="text-sm text-ink">{error}</p> : null}
              <button type="button" onClick={() => setOpen(false)} className="mt-1 h-12 font-display text-ink-muted">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
