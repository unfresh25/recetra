"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { DATA_TAG } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

const NewBranch = z.object({
  storeId: z.uuid(),
  name: z.string().trim().min(1, "Ponle un nombre.").max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Saves a branch OSM doesn't know, at the user's current location. */
export async function addBranch(input: z.input<typeof NewBranch>) {
  const parsed = NewBranch.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_branch", {
    p_store_id: parsed.data.storeId,
    p_name: parsed.data.name,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
  });
  if (error) return { error: "No pudimos guardar la sucursal." };
  updateTag(DATA_TAG);
  return {};
}

export async function removeBranch(branchId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_branch", { p_branch_id: branchId });
  if (error) return { error: "No pudimos quitar la sucursal." };
  updateTag(DATA_TAG);
  return {};
}
