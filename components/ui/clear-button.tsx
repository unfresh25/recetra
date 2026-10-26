"use client";

import Image from "next/image";

export function ClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={label}
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sunken"
    >
      <Image src="/icons/X.svg" alt="" width={10} height={10} />
    </button>
  );
}
