"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { importRecipe } from "@/lib/recipes/actions";
import { cn } from "@/lib/utils/cn";

export function ImportForm({ initialUrl }: { initialUrl?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [visibility, setVisibility] = useState<"public" | "household">("public");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = String(new FormData(event.currentTarget).get("url") ?? "");
    setError(undefined);
    startTransition(async () => {
      const result = await importRecipe(url, visibility);
      if (result.error) setError(result.error);
      else if (result.recipeId) router.push(`/recipes/${result.recipeId}`);
      else router.push("/inbox");
    });
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      const input = document.querySelector<HTMLInputElement>("input[name=url]");
      if (input) input.value = text.trim();
    } catch {
      // Clipboard permission denied: the user can paste manually.
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <TextField
          label="Link del video"
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://www.tiktok.com/@…"
          defaultValue={initialUrl}
          required
          error={error}
        />
        <button type="button" onClick={paste} className="flex items-center gap-1.5 self-start text-sm font-semibold text-brand">
          <Icon name="copy" size={16} /> Pegar del portapapeles
        </button>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">¿Quién puede verla?</legend>
        {(
          [
            ["public", "Todos los hogares", "Ayuda a crecer el catálogo de Recetra."],
            ["household", "Solo nuestro hogar", "Para recetas familiares o privadas."],
          ] as const
        ).map(([value, label, hint]) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-start gap-3 py-3",
            )}
          >
            <input
              type="radio"
              name="visibility"
              value={value}
              checked={visibility === value}
              onChange={() => setVisibility(value)}
              className="mt-1 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm text-ink-muted">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Card className="flex gap-3">
        <Icon name="sparkles" size={22} className="shrink-0 text-teal" />
        <p className="text-sm text-ink">
          Leemos el texto del video y armamos ingredientes, pasos y el momento del día. Si el video no los escribe, lo
          escuchamos. Te avisamos en la bandeja para que la revises.
        </p>
      </Card>

      <div className="mt-auto pb-safe">
        <Button type="submit" block loading={pending}>
          Importar receta
        </Button>
      </div>
    </form>
  );
}
