"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";

interface Props {
  profile: {
    full_name: string;
    phone: string;
    province_name: string;
    city_name: string;
    address_line: string;
  };
  shippingFee: number;
  snapJsUrl: string;
  clientKey: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export default function CheckoutClient({
  profile,
  shippingFee,
  snapJsUrl,
  clientKey,
}: Props) {
  const router = useRouter();
  const { items, hydrated, subtotal, clear } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [promoOk, setPromoOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load the Snap script once.
  useEffect(() => {
    if (document.getElementById("midtrans-snap")) return;
    const s = document.createElement("script");
    s.id = "midtrans-snap";
    s.src = snapJsUrl;
    s.setAttribute("data-client-key", clientKey);
    document.body.appendChild(s);
  }, [snapJsUrl, clientKey]);

  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;

  async function applyPromo() {
    setPromoMsg(null);
    if (!promoInput.trim()) return;
    const res = await fetch("/api/promo/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput.trim(), subtotal }),
    });
    const data = await res.json();
    if (data.valid) {
      setApplied({ code: data.code, discount: data.discount });
      setPromoOk(true);
      setPromoMsg(data.message);
    } else {
      setApplied(null);
      setPromoOk(false);
      setPromoMsg(data.message ?? "Code not valid.");
    }
  }

  function clearPromo() {
    setApplied(null);
    setPromoInput("");
    setPromoMsg(null);
    setPromoOk(false);
  }

  async function pay() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        promoCode: applied?.code ?? promoInput.trim() ?? null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Checkout failed.");
      return;
    }

    const finish = async () => {
      // Pull the real status from Midtrans now so /account reflects it immediately,
      // even on localhost where the webhook can't reach us.
      try {
        await fetch("/api/payment/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });
      } catch {
        /* webhook/cron will reconcile later if this fails */
      }
      clear();
      router.push("/account");
      router.refresh();
    };

    if (window.snap && data.token) {
      window.snap.pay(data.token, {
        onSuccess: finish,
        onPending: finish,
        onError: () => {
          setLoading(false);
          setError("Payment failed. You can retry from your account.");
        },
        onClose: () => {
          setLoading(false);
          // order stays pending; user can pay later from /account
          router.push("/account");
        },
      });
    } else if (data.redirectUrl) {
      clear();
      window.location.href = data.redirectUrl;
    } else {
      setLoading(false);
      setError("Could not open the payment window.");
    }
  }

  if (!hydrated) {
    return <p className="muted">Loading…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h2>Your cart is empty</h2>
        <Link className="btn btn-primary mt-16" href="/#catalog">
          BROWSE CATALOG
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-layout">
      <div>
        <div className="card">
          <h2>Shipping to</h2>
          <div className="muted" style={{ lineHeight: 1.9 }}>
            <div>
              <strong style={{ color: "var(--text-color)" }}>
                {profile.full_name}
              </strong>{" "}
              · {profile.phone}
            </div>
            <div>
              {profile.address_line}, {profile.city_name}, {profile.province_name}
            </div>
          </div>
          <Link className="btn btn-outline btn-sm mt-16" href="/account/profile">
            EDIT ADDRESS
          </Link>
        </div>

        <div className="card">
          <h2>Items</h2>
          {items.map((i) => (
            <div className="cart-line" key={i.variantId}>
              <div className="cart-line-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.imageUrl ?? "/asset/logo.png"} alt={i.name} />
              </div>
              <div>
                <div className="cart-line-name">{i.name}</div>
                <div className="cart-line-meta">
                  Size {i.size} · {i.quantity} × {formatRupiah(i.unitPrice)}
                </div>
              </div>
              <div className="cart-line-price">
                {formatRupiah(i.unitPrice * i.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="summary">
        <h3>ORDER SUMMARY</h3>

        <div className="promo-row">
          <input
            placeholder="PROMO CODE"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            disabled={!!applied}
          />
          {applied ? (
            <button className="btn btn-outline btn-sm" onClick={clearPromo}>
              CLEAR
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={applyPromo}>
              APPLY
            </button>
          )}
        </div>
        {promoMsg && (
          <div className={`alert ${promoOk ? "alert-success" : "alert-error"}`}>
            {promoMsg}
          </div>
        )}

        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="summary-row discount">
            <span>Discount</span>
            <span>−{formatRupiah(discount)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Shipping</span>
          <span>{formatRupiah(shippingFee)}</span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <span>{formatRupiah(total)}</span>
        </div>

        {error && <div className="alert alert-error mt-16">{error}</div>}

        <button
          className="btn btn-primary btn-block mt-16"
          onClick={pay}
          disabled={loading}
        >
          {loading ? "Processing…" : "PAY NOW"}
        </button>
        <p className="field-hint mt-8" style={{ textAlign: "center" }}>
          Secure payment via Midtrans. Final price confirmed on the payment screen.
        </p>
      </aside>
    </div>
  );
}
