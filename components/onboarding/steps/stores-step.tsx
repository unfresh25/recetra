"use client";

import { useMemo, useState } from "react";
import { saveStores } from "@/lib/onboarding/actions";
import { DrawablyCheckbox, DrawablyInput } from "@/components/ui/drawably";
import { StoreLogo } from "@/components/ui/store-logo";
import { StepFooter } from "../step-footer";
import { useStepSave } from "../use-step-save";

export type StoreOption = { id: string; name: string; brand_color: string; logo_url: string | null };

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function StoresStep({ stores, initial, nextHref }: { stores: StoreOption[]; initial: string[]; nextHref: string }) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const { save, pending, error } = useStepSave(nextHref);

  const visible = useMemo(
    () => stores.filter((s) => normalize(s.name).includes(normalize(query))),
    [stores, query],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <DrawablyInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar tiendas…"
        aria-label="Buscar tiendas"
        className="mb-4 h-12 w-full bg-transparent px-4 text-[16px] outline-none placeholder:text-ink-faint"
      />
      <div className="grid grid-cols-2 gap-3">
        {visible.map((store) => (
          <label
            key={store.id}
            className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card bg-surface px-3 py-5"
          >
            <span className="absolute right-3 top-3">
              <DrawablyCheckbox
                checked={selected.has(store.id)}
                onChange={() => toggle(store.id)}
                aria-label={store.name}
                stroke={selected.has(store.id) ? "var(--color-brand)" : "var(--color-ink-faint)"}
              />
            </span>
            <StoreLogo store={store} size={56} />
            <span className="font-semibold">{store.name}</span>
          </label>
        ))}
      </div>
      <StepFooter
        label={selected.size > 0 ? `Continuar (${selected.size})` : "Continuar"}
        disabled={selected.size === 0}
        pending={pending}
        error={error}
        onClick={() => save(() => saveStores([...selected]))}
      />
    </>
  );
}
