"use client";

import { Checkbox, CheckboxGroup, Input, TextField } from "@heroui/react";
import { useMemo, useState } from "react";
import { saveStores } from "@/lib/onboarding/actions";
import { ClearButton } from "@/components/ui/clear-button";
import { FlowScreen } from "@/components/ui/flow-screen";
import { NextButton } from "@/components/ui/next-button";
import { SquareCheck } from "@/components/ui/square-check";
import { StoreLogo } from "@/components/ui/store-logo";
import { useStepSave } from "../use-step-save";

export type StoreOption = { id: string; name: string; brand_color: string; logo_url: string | null };

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function StoresStep({
  stores,
  initial,
  progress,
  back,
  nextHref,
}: {
  stores: StoreOption[];
  initial: string[];
  progress: number;
  back: string | null;
  nextHref: string;
}) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const { save, pending, error } = useStepSave(nextHref);

  const visible = useMemo(
    () => stores.filter((s) => normalize(s.name).includes(normalize(query))),
    [stores, query],
  );

  return (
    <FlowScreen
      back={back ?? undefined}
      progress={progress}
      title="¿Dónde haces tus compras?"
      subtitle="Elige todas las tiendas que frecuentas para realizar tus compras."
      action={
        <NextButton
          isDisabled={selected.size === 0}
          loading={pending}
          onPress={() => save(() => saveStores([...selected]))}
        />
      }
    >
      <TextField
        aria-label="Buscar tiendas"
        value={query}
        onChange={setQuery}
        fullWidth
        className="border-b-[0.5px] border-[#a9a9a9] pb-[5px]"
      >
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Buscar tiendas"
            className="min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 font-display text-[16px] leading-5 text-ink caret-brand shadow-none outline-none placeholder:text-[#8f8f8f] hover:bg-transparent focus:bg-transparent focus:ring-0 data-[focused=true]:bg-transparent data-[focused=true]:shadow-none data-[hovered=true]:bg-transparent sm:text-[16px] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? <ClearButton label="Borrar búsqueda" onClear={() => setQuery("")} /> : null}
        </div>
      </TextField>
      <CheckboxGroup
        aria-label="Tiendas"
        value={[...selected]}
        onChange={(values) => setSelected(new Set(values))}
        className="mt-5 flex flex-col gap-2.5"
      >
        {visible.map((store) => (
          <Checkbox key={store.id} value={store.id} aria-label={store.name} className="btn-ghost mt-0 w-full">
            <Checkbox.Content className="flex w-full items-center gap-2.5">
              {({ isSelected, isFocusVisible }) => (
                <>
                  <span className="size-15 shrink-0 overflow-hidden rounded-[5px] [&>*]:rounded-[5px]">
                    <StoreLogo store={store} size={60} />
                  </span>
                  <span className="min-w-0 flex-1 font-display text-[16px] leading-5 font-normal text-ink">{store.name}</span>
                  <SquareCheck checked={isSelected} focusVisible={isFocusVisible} />
                </>
              )}
            </Checkbox.Content>
          </Checkbox>
        ))}
      </CheckboxGroup>
      {visible.length === 0 ? (
        <p className="font-sans text-sm text-[#8f8f8f]">No encontramos esa tienda.</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-6 font-sans text-sm text-danger">
          {error}
        </p>
      ) : null}
    </FlowScreen>
  );
}
