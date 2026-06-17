import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { PromoCode } from "@/lib/types";

export const runtime = "nodejs";

// Read-only promo validation for the checkout preview. Does NOT consume the code —
// authoritative validation + consumption happens atomically in create_order().
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ valid: false, message: "Not configured." });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ valid: false, message: "Please log in." }, { status: 401 });
  }

  let body: { code?: string; subtotal?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, message: "Invalid request." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const subtotal = Math.max(0, Math.floor(Number(body.subtotal) || 0));
  if (!code) return NextResponse.json({ valid: false, message: "Enter a code." });

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[promo/preview] admin client error:", e);
    return NextResponse.json(
      { valid: false, message: "Server not configured (service role key)." },
      { status: 500 },
    );
  }

  const { data: promo, error: readError } = await admin
    .from("promo_codes")
    .select("*")
    .ilike("code", code)
    .maybeSingle<PromoCode>();

  if (readError) {
    // Don't masquerade a DB/auth failure as "invalid code".
    console.error("[promo/preview] read error:", readError);
    return NextResponse.json(
      { valid: false, message: "Couldn't verify the code (server error)." },
      { status: 500 },
    );
  }
  if (!promo) {
    return NextResponse.json({ valid: false, message: "Code not found." });
  }
  if (!promo.is_active) {
    return NextResponse.json({ valid: false, message: "Code is disabled." });
  }
  const now = Date.now();
  if (new Date(promo.valid_from).getTime() > now) {
    return NextResponse.json({ valid: false, message: "Code not active yet." });
  }
  if (promo.valid_until && new Date(promo.valid_until).getTime() < now) {
    return NextResponse.json({ valid: false, message: "Code has expired." });
  }
  if (subtotal < promo.min_subtotal) {
    return NextResponse.json({
      valid: false,
      message: `Min. spend Rp ${promo.min_subtotal.toLocaleString("id-ID")}.`,
    });
  }
  if (
    promo.total_usage_limit !== null &&
    promo.used_count >= promo.total_usage_limit
  ) {
    return NextResponse.json({ valid: false, message: "Code usage limit reached." });
  }
  if (promo.per_user_limit !== null) {
    const { count } = await admin
      .from("promo_code_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", promo.id)
      .eq("user_id", user.id);
    if ((count ?? 0) >= promo.per_user_limit) {
      return NextResponse.json({ valid: false, message: "You've already used this code." });
    }
  }

  let discount =
    promo.type === "percentage"
      ? Math.floor((subtotal * promo.value) / 100)
      : promo.value;
  if (promo.max_discount !== null && discount > promo.max_discount) {
    discount = promo.max_discount;
  }
  if (discount > subtotal) discount = subtotal;

  return NextResponse.json({
    valid: true,
    discount,
    code: promo.code,
    message: `Promo applied: −Rp ${discount.toLocaleString("id-ID")}`,
  });
}
