import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/** Service-role client for catalog writes and background jobs. Never expose to the browser. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing environment variable SUPABASE_SECRET_KEY");
  return createClient<Database>(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
