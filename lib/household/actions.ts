"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DATA_TAG } from "@/lib/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const RPC_ERRORS: Record<string, string> = {
  already_in_household: "Ya perteneces a un hogar.",
  invitation_not_found: "Esta invitación no existe.",
  invitation_used: "Esta invitación ya fue usada. Pide una nueva.",
  invitation_expired: "Esta invitación venció. Pide una nueva.",
  not_in_household: "Primero crea o únete a un hogar.",
  invalid_avatar: "No pudimos guardar tu foto. Intenta subirla de nuevo.",
};

function rpcErrorMessage(message: string) {
  return RPC_ERRORS[message] ?? "Algo salió mal. Intenta de nuevo.";
}

const displayName = z.string().trim().min(1, "Escribe tu nombre.").max(40, "Máximo 40 caracteres.");

const fullName = z.string().trim().min(1, "Escribe tu nombre.").max(80, "Máximo 80 caracteres.");
const avatarPath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/)
  .optional()
  .or(z.literal("").transform(() => undefined));

const createHouseholdSchema = z.object({
  householdName: z.string().trim().min(1, "Ponle nombre a tu hogar.").max(60, "Máximo 60 caracteres."),
  displayName,
  fullName,
  avatarPath,
});

export async function createHousehold(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = createHouseholdSchema.safeParse({
    householdName: formData.get("householdName"),
    displayName: formData.get("displayName"),
    fullName: formData.get("fullName"),
    avatarPath: formData.get("avatarPath") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: parsed.data.householdName,
    p_display_name: parsed.data.displayName,
    p_full_name: parsed.data.fullName,
    p_avatar_path: parsed.data.avatarPath,
  });
  if (error) return { error: rpcErrorMessage(error.message) };

  updateTag(DATA_TAG);
  redirect("/plan");
}

export async function acceptInvitation(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = displayName.safeParse(formData.get("displayName"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", {
    p_token: token,
    p_display_name: parsed.data,
  });
  if (error) return { error: rpcErrorMessage(error.message) };

  updateTag(DATA_TAG);
  redirect("/plan");
}

export async function createInvitation(): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invitation");
  if (error || !data) return { error: rpcErrorMessage(error?.message ?? "") };
  return { token: data };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  updateTag(DATA_TAG);
  redirect("/welcome");
}
