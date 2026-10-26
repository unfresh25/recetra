import "server-only";
import { privateData } from "@/lib/cache";
import { createClient } from "@/lib/supabase/server";

/** Avatars live in a private bucket; sign them with the member's session. */
export async function getMemberAvatarUrl(memberId: string) {
  const supabase = await createClient();
  const { data: member } = await supabase.from("members").select("avatar_path").eq("id", memberId).maybeSingle();
  if (!member?.avatar_path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(member.avatar_path, 3600);
  return data?.signedUrl ?? null;
}

export async function listMembers() {
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
  const { data } = await supabase.from("members").select("id, display_name, accent_color, role").order("created_at");
  return data ?? [];
}

export async function getPreferenceRows(memberId: string) {
  "use cache: private";
  privateData();
  const supabase = await createClient({ privateCache: true });
  const [{ data: stores }, { data: restrictions }] = await Promise.all([
    supabase.from("household_stores").select("stores (name, sort_order)"),
    supabase
      .from("restrictions")
      .select("kind, allergen, diet, ingredient_category, ingredients (name)")
      .eq("member_id", memberId),
  ]);
  return { stores: stores ?? [], restrictions: restrictions ?? [] };
}
