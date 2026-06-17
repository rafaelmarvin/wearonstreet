import "server-only";

import { createHash } from "crypto";
import { MIDTRANS_IS_SANDBOX, MIDTRANS_SERVER_KEY } from "@/lib/env";

const SNAP_BASE = MIDTRANS_IS_SANDBOX
  ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
  : "https://app.midtrans.com/snap/v1/transactions";

const API_BASE = MIDTRANS_IS_SANDBOX
  ? "https://api.sandbox.midtrans.com/v2"
  : "https://api.midtrans.com/v2";

function authHeader(): string {
  // HTTP Basic auth: base64(serverKey + ":")
  return "Basic " + Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");
}

export interface SnapItemDetail {
  id: string;
  name: string;
  price: number; // integer rupiah (can be negative for discounts)
  quantity: number;
}

export interface CreateSnapParams {
  orderId: string;
  grossAmount: number;
  items: SnapItemDetail[];
  customer: {
    first_name: string;
    email: string;
    phone: string;
  };
  /** ISO start time + minutes until the payment link expires. */
  expiryMinutes?: number;
  finishUrl?: string;
}

export interface SnapResult {
  token: string;
  redirect_url: string;
}

/** Create a Snap transaction. Returns the Snap token + redirect URL. */
export async function createSnapTransaction(
  params: CreateSnapParams,
): Promise<SnapResult> {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY is not set.");
  }

  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    item_details: params.items,
    customer_details: params.customer,
    credit_card: { secure: true },
  };

  if (params.expiryMinutes) {
    body.expiry = { unit: "minutes", duration: params.expiryMinutes };
  }
  if (params.finishUrl) {
    body.callbacks = { finish: params.finishUrl };
  }

  const res = await fetch(SNAP_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans Snap error ${res.status}: ${text}`);
  }
  return (await res.json()) as SnapResult;
}

export interface MidtransStatus {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  gross_amount?: string;
  status_code?: string;
  signature_key?: string;
  status_message?: string;
}

/** Authoritative status check (server-to-server). Use this to confirm a webhook. */
export async function getTransactionStatus(
  orderId: string,
): Promise<MidtransStatus | null> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: authHeader() },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Midtrans status error ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as MidtransStatus;
}

/**
 * Verify the notification signature:
 *   sha512(order_id + status_code + gross_amount + serverKey)
 * gross_amount must be the RAW string from the payload (do not reformat).
 */
export function verifySignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const expected = createHash("sha512")
    .update(
      payload.order_id +
        payload.status_code +
        payload.gross_amount +
        MIDTRANS_SERVER_KEY,
    )
    .digest("hex");
  return expected === payload.signature_key;
}

export type MappedStatus = "paid" | "pending" | "expired" | "cancelled" | "ignore";

/** Map Midtrans transaction_status + fraud_status to our internal action. */
export function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string,
): MappedStatus {
  switch (transactionStatus) {
    case "settlement":
      return "paid";
    case "capture":
      // credit card: only accept when not flagged for fraud review
      if (fraudStatus === "accept") return "paid";
      if (fraudStatus === "challenge") return "pending";
      return "ignore";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    case "cancel":
    case "deny":
      return "cancelled";
    default:
      return "ignore";
  }
}
