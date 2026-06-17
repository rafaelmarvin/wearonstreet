import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveShippingFee } from "@/lib/shipping";
import {
  createSnapTransaction,
  type SnapItemDetail,
} from "@/lib/midtrans";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import type { Order, OrderItem, Profile } from "@/lib/types";

export const runtime = "nodejs";

const ORDER_EXPIRY_MINUTES = 30;

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

function mapOrderError(message: string): string {
  if (message.startsWith("OUT_OF_STOCK"))
    return "Sorry, one of your items just sold out or doesn't have enough stock. Please adjust your cart.";
  if (message.startsWith("VARIANT_NOT_FOUND"))
    return "An item in your cart is no longer available.";
  if (message.startsWith("EMPTY_CART")) return "Your cart is empty.";
  if (message.startsWith("INVALID_QUANTITY")) return "Invalid item quantity.";
  if (message.startsWith("PROMO_INVALID"))
    return "That promo code isn't valid.";
  if (message.startsWith("PROMO_EXPIRED"))
    return "That promo code has expired.";
  if (message.startsWith("PROMO_MIN_SUBTOTAL"))
    return "Your subtotal doesn't meet this promo code's minimum.";
  if (message.startsWith("PROMO_PER_USER"))
    return "You've already used this promo code.";
  if (message.startsWith("PROMO_EXHAUSTED"))
    return "This promo code has reached its usage limit.";
  return "We couldn't create your order. Please try again.";
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Store is not configured yet." },
      { status: 503 },
    );
  }

  // 1) authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  // 2) parse + validate input
  let payload: { items?: CheckoutItem[]; promoCode?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const items = (payload.items ?? []).filter(
    (i) => i.variantId && Number(i.quantity) > 0,
  );
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // 3) profile (authoritative shipping address)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) {
    return NextResponse.json(
      { error: "Please complete your profile before checkout.", needsProfile: true },
      { status: 400 },
    );
  }

  // 4) shipping fee (server-side, from profile destination)
  const shippingFee = resolveShippingFee(
    profile.province_code,
    profile.city_name,
  );

  // 5) atomic order creation (price + stock + promo) via service role
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[checkout] admin client error:", e);
    return NextResponse.json(
      { error: "Store is not fully configured (server key). Please contact support." },
      { status: 500 },
    );
  }
  const midtransOrderId = `WOS-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
  const expiresAt = new Date(
    Date.now() + ORDER_EXPIRY_MINUTES * 60_000,
  ).toISOString();

  const { data: orderId, error: rpcError } = await admin.rpc("create_order", {
    p_user_id: user.id,
    p_items: items.map((i) => ({
      variant_id: i.variantId,
      quantity: Math.floor(i.quantity),
    })),
    p_promo_code: payload.promoCode?.trim() || null,
    p_shipping_fee: shippingFee,
    p_midtrans_order_id: midtransOrderId,
    p_ship_full_name: profile.full_name,
    p_ship_phone: profile.phone,
    p_ship_province_code: profile.province_code,
    p_ship_province_name: profile.province_name,
    p_ship_city_name: profile.city_name,
    p_ship_address_line: profile.address_line,
    p_expires_at: expiresAt,
  });

  if (rpcError) {
    const KNOWN = [
      "OUT_OF_STOCK",
      "VARIANT_NOT_FOUND",
      "EMPTY_CART",
      "INVALID_QUANTITY",
      "INVALID_SHIPPING",
      "PROMO_INVALID",
      "PROMO_EXPIRED",
      "PROMO_MIN_SUBTOTAL",
      "PROMO_PER_USER",
      "PROMO_EXHAUSTED",
    ];
    const isBusinessError = KNOWN.some((p) => rpcError.message.startsWith(p));
    if (!isBusinessError) {
      // Auth/permission/connection failure — NOT a promo/stock problem. Surface clearly.
      console.error("[checkout] create_order failed:", rpcError);
      return NextResponse.json(
        {
          error:
            "We couldn't process your order (server error). Please try again or contact support.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: mapOrderError(rpcError.message) },
      { status: 409 },
    );
  }

  // 6) read back the authoritative order + items
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId as string)
    .single<Order>();
  const { data: orderItems } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId as string)
    .returns<OrderItem[]>();

  if (!order || !orderItems) {
    return NextResponse.json(
      { error: "Order creation failed unexpectedly." },
      { status: 500 },
    );
  }

  // 7) build Midtrans item_details so sum(item_details) === gross_amount
  const itemDetails: SnapItemDetail[] = orderItems.map((it) => ({
    id: it.variant_id,
    name: `${it.product_name} - ${it.size}`.slice(0, 50),
    price: it.unit_price,
    quantity: it.quantity,
  }));
  itemDetails.push({
    id: "SHIPPING",
    name: "Ongkos Kirim",
    price: order.shipping_fee,
    quantity: 1,
  });
  if (order.discount_amount > 0) {
    itemDetails.push({
      id: "DISCOUNT",
      name: "Potongan Promo",
      price: -order.discount_amount,
      quantity: 1,
    });
  }

  const sum = itemDetails.reduce((s, i) => s + i.price * i.quantity, 0);
  if (sum !== order.gross_amount) {
    // Safety net — should never happen given DB CHECK constraints.
    return NextResponse.json(
      { error: "Order total mismatch. Please contact support." },
      { status: 500 },
    );
  }

  // 8) create the Snap transaction
  let snap;
  try {
    snap = await createSnapTransaction({
      orderId: order.midtrans_order_id,
      grossAmount: order.gross_amount,
      items: itemDetails,
      customer: {
        first_name: profile.full_name,
        email: user.email ?? "",
        phone: profile.phone,
      },
      expiryMinutes: ORDER_EXPIRY_MINUTES,
      finishUrl: `${SITE_URL}/account`,
    });
  } catch (e) {
    // Roll back the reservation so stock/promo aren't held by a dead order.
    await admin.rpc("release_order", {
      p_midtrans_order_id: order.midtrans_order_id,
      p_new_status: "cancelled",
      p_txn_status: "snap_failed",
    });
    return NextResponse.json(
      { error: "Payment gateway error. Please try again.", detail: String(e) },
      { status: 502 },
    );
  }

  // 9) persist the snap token/redirect
  await admin.rpc("attach_snap", {
    p_order_id: order.id,
    p_token: snap.token,
    p_redirect_url: snap.redirect_url,
  });

  return NextResponse.json({
    orderId: order.id,
    midtransOrderId: order.midtrans_order_id,
    token: snap.token,
    redirectUrl: snap.redirect_url,
    grossAmount: order.gross_amount,
  });
}
