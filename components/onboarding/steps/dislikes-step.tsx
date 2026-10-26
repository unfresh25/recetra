"use client";

import { Input, TextField, ToggleButton } from "@heroui/react";
import { useMemo, useState } from "react";
import { ClearButton } from "@/components/ui/clear-button";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { SquareCheck } from "@/components/ui/square-check";
import { saveDislikes } from "@/lib/onboarding/actions";
import { COMMON_DISLIKES, type IngredientCategory } from "@/lib/onboarding/options";
import { useStepSave } from "../use-step-save";

export type IngredientOption = { id: string; slug: string; name: string; aliases: string[] };

const chipClassName = "h-auto rounded-[5px] border border-[#a9a9a9] bg-transparent px-2 py-[5px] font-display text-[16px] leading-5 font-normal text-ink shadow-none outline-none data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:text-[#faf9f7] data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-brand md:h-auto";

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function DislikesStep({
  ingredients,
  initialIngredientIds,
  initialCategories,
  progress,
  back,
  nextHref,
}: {
  ingredients: IngredientOption[];
  initialIngredientIds: string[];
  initialCategories: IngredientCategory[];
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  const [ids, setIds] = useState(() => new Set(initialIngredientIds));
  const [categories, setCategories] = useState(() => new Set(initialCategories));
  const [query, setQuery] = useState("");
  const { save, pending, error } = useStepSave(nextHref);
  const searchActive = normalize(query).length >= 2;

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
    <FlowScreen
      back={back ?? undefined}
      progress={progress}
      title="¿Algún ingrediente que no comas?"
      subtitle="Muchas veces hay ingredientes que detestamos, cuéntanos cuáles son para ti."
      action={
        <NextButton
          loading={pending}
          onPress={() => save(() => saveDislikes([...ids], [...categories]))}
        />
      }
      secondaryAction={
        <span className="font-sans text-sm text-[#8f8f8f]">
          {count === 0 ? "Como de todo" : `${count} ${count === 1 ? "elegido" : "elegidos"}`}
        </span>
      }
    >
      <TextField
        aria-label="Buscar ingrediente"
        value={query}
        onChange={setQuery}
        fullWidth
        className="border-b-[0.5px] border-[#a9a9a9] pb-[5px]"
      >
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Buscar un ingrediente"
            className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 font-display text-[16px] leading-5 text-ink caret-brand shadow-none outline-none placeholder:text-[#8f8f8f] hover:bg-transparent focus:bg-transparent focus:ring-0 data-[focused=true]:bg-transparent data-[focused=true]:shadow-none data-[hovered=true]:bg-transparent sm:text-[16px] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? <ClearButton label="Borrar búsqueda" onClear={() => setQuery("")} /> : null}
        </div>
      </TextField>

      <div className="mt-5">
        {searchActive ? results.length > 0 ? (
          <ul className="divide-y-[0.5px] divide-[#e7e4df]">
            {results.map((ingredient) => (
              <li key={ingredient.id}>
                <ToggleButton
                  isSelected={ids.has(ingredient.id)}
                  onChange={() => {
                    toggleId(ingredient.id);
                    setQuery("");
                  }}
                  className="h-12 w-full justify-between rounded-none bg-transparent p-0 font-display text-[16px] leading-5 font-normal text-ink shadow-none outline-none data-[selected=true]:bg-transparent data-[selected=true]:text-ink data-[focus-visible=true]:outline-none md:h-12"
                >
                  {({ isSelected, isFocusVisible }) => (
                    <>
                      <span className="min-w-0 text-left whitespace-normal">{ingredient.name}</span>
                      <SquareCheck checked={isSelected} focusVisible={isFocusVisible} />
                    </>
                  )}
                </ToggleButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-sm text-[#8f8f8f]">No encontramos ese ingrediente.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-2.5 gap-y-5">
              {COMMON_DISLIKES.map((item) => {
                if (item.kind === "category") {
                  return (
                    <ToggleButton
                      key={item.value}
                      isSelected={categories.has(item.value)}
                      onChange={() => toggleCategory(item.value)}
                      className={chipClassName}
                    >
                      {item.label}
                    </ToggleButton>
                  );
                }
                const ingredient = bySlug.get(item.slug);
                if (!ingredient) return null;
                return (
                  <ToggleButton
                    key={ingredient.id}
                    isSelected={ids.has(ingredient.id)}
                    onChange={() => toggleId(ingredient.id)}
                    className={chipClassName}
                  >
                    {item.label ?? ingredient.name}
                  </ToggleButton>
                );
              })}
              {extraIds.map((id) => (
                <ToggleButton key={id} isSelected onChange={() => toggleId(id)} className={chipClassName}>
                  {byId.get(id)?.name ?? "Ingrediente"}
                </ToggleButton>
              ))}
            </div>

            <p className="mt-6 font-sans text-sm text-[#8f8f8f]">
              Si es un adorno lo quitamos de la receta; si es el protagonista, no te mostramos esa receta.
            </p>
          </>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-6 font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}
    </FlowScreen>
  );
}
