"use client";

import { useEffect, useState } from "react";

/** "Listo" time if cooking starts now (client clock). */
export function ReadyAt({ minutes }: { minutes: number | null }) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    if (!minutes) return;
    const update = () => {
      const d = new Date(Date.now() + minutes * 60_000);
      const h = d.getHours();
      setLabel(`${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${h < 12 ? "am" : "pm"}`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [minutes]);
  return <>{label}</>;
}
