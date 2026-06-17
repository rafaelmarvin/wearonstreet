import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTransactionStatus,
  mapTransactionStatus,
} from "@/lib/midtrans";
import { CRON_SECRET, isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";

// Safety net: catch pending orders whose payment window has passed in case a
// Midtrans webhook was missed. Re-checks the real status before expiring, so a
// silently-settled order is promoted to paid rather than wrongly expired.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: stale } = await admin
    .from("orders")
    .select("midtrans_order_id")
    .eq("status", "pending_payment")
    .lt("expires_at", nowIso)
    .limit(50);

  let paid = 0;
  let expired = 0;

  for (const o of stale ?? []) {
    const orderId = o.midtrans_order_id as string;
    let action: ReturnType<typeof mapTransactionStatus> = "expired";
    try {
      const status = await getTransactionStatus(orderId);
      if (status) {
        action = mapTransactionStatus(
          status.transaction_status,
          status.fraud_status,
        );
      }
    } catch {
      // if Midtrans is unreachable, treat as expired (guarded restock is safe)
    }

    if (action === "paid") {
      await admin.rpc("mark_order_paid", {
        p_midtrans_order_id: orderId,
        p_txn_status: "settlement",
        p_payment_method: null,
      });
      paid++;
    } else {
      await admin.rpc("release_order", {
        p_midtrans_order_id: orderId,
        p_new_status: "expired",
        p_txn_status: "expired",
      });
      expired++;
    }
  }

  return NextResponse.json({ processed: stale?.length ?? 0, paid, expired });
}
