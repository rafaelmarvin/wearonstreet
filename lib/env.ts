// Centralized environment access. NEXT_PUBLIC_* values are safe in the browser;
// everything else must only be read in server code (route handlers / server components).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the public Supabase config is present. Lets the UI degrade gracefully
 *  before the store owner has wired up their Supabase project. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

// Server-only secrets (do NOT import these into client components).
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";
export const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Midtrans public config.
export const MIDTRANS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
export const MIDTRANS_IS_SANDBOX =
  (process.env.NEXT_PUBLIC_MIDTRANS_IS_SANDBOX ?? "true") !== "false";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
