"use client";

import { useMemo, useSyncExternalStore } from "react";

// A shopping trip is personal and remains usable without signal.
const CHECKED_KEY = "recetra:shopping-checked";
const listeners = new Set<() => void>();
const readChecked = () => localStorage.getItem(CHECKED_KEY) ?? "[]";
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCheckedItems() {
  const raw = useSyncExternalStore(subscribe, readChecked, () => "[]");
  const checked = useMemo(() => {
    try {
      const ids: unknown = JSON.parse(raw);
      return new Set<string>(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
  function save(ids: Set<string>) {
    localStorage.setItem(CHECKED_KEY, JSON.stringify([...ids]));
    listeners.forEach((listener) => listener());
  }
  return { checked, save, toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    save(next);
  } };
}
