"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { DrawablyInput } from "@/components/ui/drawably";
import { Icon } from "@/components/ui/icon";
import { saveDislikes } from "@/lib/onboarding/actions";
import { COMMON_DISLIKES, type IngredientCategory } from "@/lib/onboarding/options";
import { StepFooter } from "../step-footer";
import { useStepSave } from "../use-step-save";

export type IngredientOption = { id: string; slug: string; name: string; aliases: string[] };

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function DislikesStep({
  ingredients,
  initialIngredientIds,
  initialCategories,
  nextHref,
}: {
  ingredients: IngredientOption[];
  initialIngredientIds: string[];
  initialCategories: IngredientCategory[];
  nextHref: string;
}) {
  const [ids, setIds] = useState(() => new Set(initialIngredientIds));
  const [categories, setCategories] = useState(() => new Set(initialCategories));
  const [query, setQuery] = useState("");
  const { save, pending, error } = useStepSave(nextHref);

  const bySlug = useMemo(() => new Map(ingredients.map((i) => [i.slug, i])), [ingredients]);
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [];
    return ingredients
      .filter((i) => normalize(i.name).includes(q) || i.aliases.some((a) => normalize(a).includes(q)))
      .slice(0, 8);
  }, [ingredients, query]);

  const quickIds = new Set(
    COMMON_DISLIKES.flatMap((d) => (d.kind === "ingredient" && bySlug.get(d.slug) ? [bySlug.get(d.slug)!.id] : [])),
  );
  // Picks made through search that aren't quick chips get their own chips.
  const extraIds = [...ids].filter((id) => !quickIds.has(id));

  function toggleId(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(value: IngredientCategory) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const count = ids.size + categories.size;

  return (
    <>
      <div className="relative mb-5">
        <DrawablyInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un ingrediente…"
          aria-label="Buscar ingrediente"
          className="h-12 w-full bg-transparent px-4 text-[16px] outline-none placeholder:text-ink-faint"
        />
        {results.length > 0 ? (
          <ul className="absolute inset-x-0 top-14 z-10 overflow-hidden rounded-card bg-surface">
            {results.map((ingredient) => (
              <li key={ingredient.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!ids.has(ingredient.id)) toggleId(ingredient.id);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-[15px] hover:bg-sunken"
                >
                  {ingredient.name}
                  {ids.has(ingredient.id) ? <span className="text-sm text-brand">Agregado</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {COMMON_DISLIKES.map((item) => {
          if (item.kind === "category") {
            return (
              <Chip
                key={item.value}
                selected={categories.has(item.value)}
                onClick={() => toggleCategory(item.value)}
                leading={<Icon name={item.icon} size={16} />}
              >
                {item.label} (todo)
              </Chip>
            );
          }
          const ingredient = bySlug.get(item.slug);
          if (!ingredient) return null;
          return (
            <Chip key={ingredient.id} selected={ids.has(ingredient.id)} onClick={() => toggleId(ingredient.id)}>
              {ingredient.name}
            </Chip>
          );
        })}
        {extraIds.map((id) => (
          <Chip key={id} selected onClick={() => toggleId(id)}>
            {byId.get(id)?.name ?? "Ingrediente"}
          </Chip>
        ))}
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Si el ingrediente es un adorno lo quitamos de la receta; si es el protagonista, no te mostramos esa receta.
      </p>

      <StepFooter
        label={count === 0 ? "Como de todo" : `Continuar (${count})`}
        pending={pending}
        error={error}
        onClick={() => save(() => saveDislikes([...ids], [...categories]))}
      />
    </>
  );
}
