import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/env";

const PLACEHOLDER = "your-service-role-secret-key";

/** True when a real (non-placeholder) service-role key is configured. */
export function isServiceRoleConfigured(): boolean {
  return (
    SUPABASE_SERVICE_ROLE_KEY.length > 0 &&
    SUPABASE_SERVICE_ROLE_KEY !== PLACEHOLDER
  );
}

/** Service-role Supabase client. Bypasses RLS — SERVER ONLY.
 *  Use exclusively in route handlers / server actions for the authoritative
 *  writes (order creation, stock changes, status transitions, promo usage). */
export function createAdminClient() {
  if (!isServiceRoleConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing or still the placeholder. " +
        "Set it to your Supabase secret/service_role key in .env.local (server only) and restart.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
