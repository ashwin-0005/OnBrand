import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@/types";

/** Session as seen on the server only. `token` (Supabase access token) must never be sent to the browser. */
export interface ServerSession extends Session {
  token?: string;
}

/**
 * Supabase (free tier) is used when its URL + anon key are set; otherwise the in-memory demo store runs,
 * so the app works with zero accounts.
 */
export const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * A client that acts AS the signed-in user (their access token), so Postgres row-level security applies.
 * The service-role key is never used by the app, only by the seed script.
 */
export function userClient(token?: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
