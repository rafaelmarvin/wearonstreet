import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTransactionStatus,
  mapTransactionStatus,
} from "@/lib/midtrans";
import { isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";

// Pull the authoritative status FROM Midtrans for one of the caller's own orders
// and apply the transition. Works without a public webhook URL (server → Midtrans),
// so it's the fix for local testing and a safety net for missed webhooks in prod.
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  // RLS ensures the caller can only read their own order (admins can read any).
  const { data: order } = await supabase
    .from("orders")
    .select("id, midtrans_order_id, status, gross_amount")
    .eq("id", body.orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "pending_payment") {
    return NextResponse.json({ status: order.status, changed: false });
  }

  // Ask Midtrans for the real status.
  let status;
  try {
    status = await getTransactionStatus(order.midtrans_order_id);
  } catch (e) {
    console.error("[payment/sync] midtrans status error:", e);
    return NextResponse.json(
      { error: "Couldn't reach the payment gateway." },
      { status: 502 },
    );
  }
  if (!status) {
    return NextResponse.json({
      status: order.status,
      changed: false,
      message: "No payment recorded yet.",
    });
  }

  // Anti-tamper: amount Midtrans knows must match our order.
  if (
    status.gross_amount &&
    Math.round(parseFloat(status.gross_amount)) !== order.gross_amount
  ) {
    return NextResponse.json({ error: "Amount mismatch." }, { status: 409 });
  }

  const admin = createAdminClient();
  const action = mapTransactionStatus(
    status.transaction_status,
    status.fraud_status,
  );

  if (action === "paid") {
    await admin.rpc("mark_order_paid", {
      p_midtrans_order_id: order.midtrans_order_id,
      p_txn_status: status.transaction_status,
      p_payment_method: status.payment_type ?? null,
    });
  } else if (action === "expired") {
    await admin.rpc("release_order", {
      p_midtrans_order_id: order.midtrans_order_id,
      p_new_status: "expired",
      p_txn_status: status.transaction_status,
    });
  } else if (action === "cancelled") {
    await admin.rpc("release_order", {
      p_midtrans_order_id: order.midtrans_order_id,
      p_new_status: "cancelled",
      p_txn_status: status.transaction_status,
    });
  }

  const { data: updated } = await admin
    .from("orders")
    .select("status")
    .eq("id", order.id)
    .single();

  return NextResponse.json({
    status: updated?.status ?? order.status,
    changed: (updated?.status ?? order.status) !== "pending_payment",
  });
}
