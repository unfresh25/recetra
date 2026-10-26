"use client";

import { Spinner } from "@heroui/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const SIZE = 512;

/** Center-crops to a square and re-encodes as WebP, so uploads stay small whatever the camera gives us. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/webp", 0.85),
  );
}

/** Round photo button: picks (or shoots) a photo, uploads it to the private avatars bucket. */
export function AvatarPicker({
  userId,
  onChange,
  onError,
}: {
  userId: string;
  /** Storage path once uploaded, or undefined while there is none. */
  onChange: (path: string | undefined) => void;
  onError: (message: string | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    onError(undefined);
    setUploading(true);
    try {
      const blob = await toSquareWebp(file);
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await createClient()
        .storage.from("avatars")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      setPreview(URL.createObjectURL(blob));
      onChange(path);
    } catch {
      onError("No pudimos subir la foto. Intenta con otra.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={preview ? "Cambiar foto" : "Agregar foto"}
        disabled={uploading}
        className={cn(
          "relative flex size-15 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink transition-transform duration-150 ease-out-soft active:scale-95",
        )}
      >
        {preview ? (
          // Object URL of the local file: next/image can't optimize it, and doesn't need to.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <Image src="/icons/Camera.svg" alt="" width={28} height={28} />
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/60">
            <Spinner color="current" size="sm" className="text-white" />
          </span>
        ) : null}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => pick(event.target.files?.[0])}
      />
    </>
  );
}
