import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTransactionStatus,
  mapTransactionStatus,
  verifySignature,
} from "@/lib/midtrans";
import { isSupabaseConfigured } from "@/lib/env";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

interface Notification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  let n: Notification;
  try {
    n = (await request.json()) as Notification;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // 1) verify signature (reject forgeries before touching the DB)
  if (
    !n.order_id ||
    !verifySignature({
      order_id: n.order_id,
      status_code: n.status_code,
      gross_amount: n.gross_amount,
      signature_key: n.signature_key,
    })
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const admin = createAdminClient();

  // 2) load our order
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("midtrans_order_id", n.order_id)
    .maybeSingle<Order>();
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // 3) anti-tamper: notified amount must match our stored gross_amount
  if (Math.round(parseFloat(n.gross_amount)) !== order.gross_amount) {
    return NextResponse.json({ error: "amount mismatch" }, { status: 403 });
  }

  // 4) re-fetch authoritative status from Midtrans (don't trust the POST blindly)
  let txnStatus = n.transaction_status;
  let fraudStatus = n.fraud_status;
  let paymentType = n.payment_type;
  try {
    const authoritative = await getTransactionStatus(n.order_id);
    if (authoritative) {
      txnStatus = authoritative.transaction_status;
      fraudStatus = authoritative.fraud_status;
      paymentType = authoritative.payment_type ?? paymentType;
    }
  } catch {
    // network hiccup — fall back to the (signature-verified) payload
  }

  // 5) map + apply idempotently (DB functions guard against backward/duplicate moves)
  const action = mapTransactionStatus(txnStatus, fraudStatus);

  if (action === "paid") {
    await admin.rpc("mark_order_paid", {
      p_midtrans_order_id: n.order_id,
      p_txn_status: txnStatus,
      p_payment_method: paymentType ?? null,
    });
  } else if (action === "expired") {
    await admin.rpc("release_order", {
      p_midtrans_order_id: n.order_id,
      p_new_status: "expired",
      p_txn_status: txnStatus,
    });
  } else if (action === "cancelled") {
    await admin.rpc("release_order", {
      p_midtrans_order_id: n.order_id,
      p_new_status: "cancelled",
      p_txn_status: txnStatus,
    });
  } else {
    // pending / challenge / ignore — record last-seen status, no transition
    await admin
      .from("orders")
      .update({ midtrans_txn_status: txnStatus })
      .eq("midtrans_order_id", n.order_id)
      .eq("status", "pending_payment");
  }

  // Always 200 so Midtrans stops retrying a handled notification.
  return NextResponse.json({ received: true });
}
