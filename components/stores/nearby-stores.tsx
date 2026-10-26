"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { PanLoaderScreen } from "@/components/ui/pan-loader";
import { StoreLogo } from "@/components/ui/store-logo";
import { TextField } from "@/components/ui/text-field";
import { addBranch, removeBranch } from "@/lib/stores/actions";
import { distanceKm, formatDistance, routeUrl, searchUrl } from "@/lib/stores/geo";
import type { Branch, NearbyStore } from "@/lib/stores/queries";
import { cn } from "@/lib/utils/cn";

// Leaflet touches window on import: load it in the browser only.
const BranchMap = dynamic(() => import("./branch-map"), {
  ssr: false,
  loading: () => <PanLoaderScreen label="Cargando el mapa…" className="min-h-64 py-12" />,
});

type Point = { lat: number; lng: number };

// The last known position survives reloads, so distances show at once.
const LOCATION_KEY = "recetra:last-location";
const locationListeners = new Set<() => void>();
const readLocation = () => (typeof window === "undefined" ? null : localStorage.getItem(LOCATION_KEY));
const subscribeLocation = (listener: () => void) => {
  locationListeners.add(listener);
  return () => locationListeners.delete(listener);
};
function saveLocation(point: Point) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(point));
  locationListeners.forEach((l) => l());
}

const isApple = () => /iPhone|iPad|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

export function NearbyStores({ stores, branches }: { stores: NearbyStore[]; branches: Branch[] }) {
  const byId = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const raw = useSyncExternalStore(subscribeLocation, readLocation, () => null);
  const here = useMemo<Point | null>(() => (raw ? JSON.parse(raw) : null), [raw]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();

  function locate() {
    setLocating(true);
    setLocationError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("No pudimos ver tu ubicación. Revisa el permiso del navegador.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 300_000 },
    );
  }

  const visible = branches
    .filter((b) => !hidden.has(b.storeId))
    .map((b) => ({ ...b, km: here ? distanceKm(here, b) : null }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || a.name.localeCompare(b.name));
  const list = here ? visible.slice(0, 25) : visible;
  const missing = stores.filter((s) => !branches.some((b) => b.storeId === s.id));

  return (
    <div className="flex flex-col gap-5">
      <BranchMap branches={visible} stores={byId} here={here} onSelect={setSelected} />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={locate} loading={locating}>
          <Icon name="location" size={16} /> {here ? "Actualizar mi ubicación" : "Usar mi ubicación"}
        </Button>
        {locationError ? <span className="text-sm text-brand">{locationError}</span> : null}
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" aria-label="Filtrar por tienda">
        {stores.map((s) => (
          <Chip
            key={s.id}
            selected={!hidden.has(s.id)}
            onClick={() =>
              setHidden((h) => {
                const next = new Set(h);
                if (next.has(s.id)) next.delete(s.id);
                else next.add(s.id);
                return next;
              })
            }
            leading={<StoreLogo store={s} size={18} />}
          >
            {s.name}
          </Chip>
        ))}
      </div>

      <ul className="divide-y divide-line" aria-label="Sucursales">
        {list.map((b) => {
          const store = byId.get(b.storeId)!;
          return (
            <li key={b.id} className={cn("flex items-center gap-3 py-3", selected === b.id && "-mx-3 rounded-2xl bg-surface px-3")}>
              <StoreLogo store={store} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{b.name}</span>
                <span className="block truncate text-sm text-ink-muted">
                  {[b.km != null ? formatDistance(b.km) : null, b.address, b.manual ? "agregada por ustedes" : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {b.manual ? <RemoveBranch id={b.id} /> : null}
              <a
                href={routeUrl(b, false)}
                onClick={(e) => {
                  if (isApple()) e.currentTarget.href = routeUrl(b, true);
                }}
                target="_blank"
                rel="noopener"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-sm font-bold text-brand"
              >
                <Icon name="route" size={18} /> Ruta
              </a>
            </li>
          );
        })}
      </ul>

      {missing.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Sin sucursales en el mapa</h2>
          {missing.map((s) => (
            <a key={s.id} href={searchUrl(s.name, here ?? undefined)} target="_blank" rel="noopener" className="flex items-center gap-3 py-2 font-semibold">
              <StoreLogo store={s} size={28} />
              Buscar {s.name} en Google Maps
              <Icon name="arrow-right" size={16} className="ml-auto text-ink-faint" />
            </a>
          ))}
        </section>
      ) : null}

      <AddBranch stores={stores} here={here} onLocate={locate} />
    </div>
  );
}

function RemoveBranch({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Quitar sucursal"
      disabled={pending}
      onClick={() => startTransition(async () => void (await removeBranch(id)))}
      className="flex size-10 items-center justify-center text-ink-faint"
    >
      <Icon name="delete" size={18} />
    </button>
  );
}

function AddBranch({ stores, here, onLocate }: { stores: NearbyStore[]; here: Point | null; onLocate: () => void }) {
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 self-start pb-4 font-semibold text-brand">
        <Icon name="add" size={18} /> Agregar mi sucursal
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 pb-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!here) return onLocate();
        const name = String(new FormData(event.currentTarget).get("name") ?? "");
        startTransition(async () => {
          const result = await addBranch({ storeId, name, lat: here.lat, lng: here.lng });
          if (result.error) setError(result.error);
          else setOpen(false);
        });
      }}
    >
      <h2 className="font-display text-lg font-bold">Agregar mi sucursal</h2>
      <p className="text-sm text-ink-muted">Párate en la tienda o cerca: guardamos tu ubicación actual como su dirección.</p>
      <div className="flex flex-wrap gap-2">
        {stores.map((s) => (
          <Chip key={s.id} selected={storeId === s.id} onClick={() => setStoreId(s.id)} leading={<StoreLogo store={s} size={18} />}>
            {s.name}
          </Chip>
        ))}
      </div>
      <TextField label="Nombre" name="name" placeholder="Ara de la 84" required error={error} />
      <Button type="submit" loading={pending}>
        {here ? "Guardar aquí" : "Usar mi ubicación"}
      </Button>
    </form>
  );
}
