"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="btn btn-outline btn-sm" onClick={signOut} disabled={loading}>
      {loading ? "Signing out…" : "SIGN OUT"}
    </button>
  );
}
