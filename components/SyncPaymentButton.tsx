"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payment/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.changed) {
        router.refresh();
      } else {
        setMsg(data.message ?? "Still awaiting payment.");
      }
    } catch {
      setMsg("Couldn't check right now. Try again shortly.");
    }
    setLoading(false);
  }

  return (
    <>
      <button
        className="btn btn-outline btn-sm mt-8"
        onClick={check}
        disabled={loading}
      >
        {loading ? "Checking…" : "I'VE PAID — CHECK STATUS"}
      </button>
      {msg && <div className="field-hint mt-8">{msg}</div>}
    </>
  );
}
