"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { saveStores } from "@/lib/onboarding/actions";
import { OptionCard } from "../option-card";
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
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar tiendas…"
        aria-label="Buscar tiendas"
        className="mb-4 h-12 rounded-full bg-surface px-5 text-[15px] shadow-card outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-brand"
      />
      <div className="grid grid-cols-2 gap-3">
        {visible.map((store) => (
          <OptionCard
            key={store.id}
            selected={selected.has(store.id)}
            onToggle={() => toggle(store.id)}
            label={store.name}
            media={<StoreLogo store={store} />}
          />
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

function isLight(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

/** Store logo, or a brand-color monogram when we have no sharp logo for it. */
export function StoreLogo({ store, size = 48 }: { store: StoreOption; size?: number }) {
  if (store.logo_url) {
    return (
      <span
        className="flex items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-line"
        style={{ width: size, height: size }}
      >
        <Image src={store.logo_url} alt="" width={size * 0.78} height={size * 0.78} className="object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-2xl font-display font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        backgroundColor: store.brand_color,
        color: isLight(store.brand_color) ? "#1a1714" : "#ffffff",
      }}
    >
      {store.name.charAt(0)}
    </span>
  );
}
