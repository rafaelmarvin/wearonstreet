import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/types";

export interface AuthState {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
}

/** Returns the current user + profile, or nulls when logged out / not configured. */
export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { userId: null, email: null, profile: null };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile | null) ?? null,
  };
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser(redirectTo = "/account"): Promise<AuthState> {
  const state = await getAuthState();
  if (!state.userId) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  return state;
}

/** Require an admin; redirect home for non-admins. */
export async function requireAdmin(): Promise<AuthState> {
  const state = await getAuthState();
  if (!state.userId) redirect("/login?redirect=/admin");
  if (!state.profile?.is_admin) redirect("/");
  return state;
}
