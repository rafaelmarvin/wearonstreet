import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";

interface SyncItem {
  variantId: string;
  quantity: number;
}

// Mirror the caller's current cart into cart_items (admin pre-checkout tracking).
// Best-effort: failures here never block shopping.
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Only logged-in customers' carts are tracked.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { items?: SyncItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const items = (body.items ?? []).filter(
    (i) => i.variantId && Number(i.quantity) > 0,
  );

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Replace the user's cart snapshot.
  await admin.from("cart_items").delete().eq("user_id", user.id);

  if (items.length > 0) {
    const nowIso = new Date().toISOString();
    const rows = items.map((i) => ({
      user_id: user.id,
      variant_id: i.variantId,
      quantity: Math.floor(i.quantity),
      updated_at: nowIso,
    }));
    const { error } = await admin.from("cart_items").insert(rows);
    if (error) {
      // e.g. a stale variant id — don't fail the shopper's flow
      console.error("[cart/sync] insert error:", error.message);
    }
  }

  return NextResponse.json({ ok: true });
}
