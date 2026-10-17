import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Server Supabase client bound to the request's cookies.
 * Inside a "use cache: private" function pass { privateCache: true }: that scope may read the clock
 * and cookies, but not connection(). Everywhere else we mark the work as request-time explicitly.
 */
export async function createClient({ privateCache = false }: { privateCache?: boolean } = {}) {
  if (!privateCache) await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
