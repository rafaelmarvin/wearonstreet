"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";

export default function CartPage() {
  const { items, hydrated, subtotal, setQty, removeItem } = useCart();

  if (!hydrated) {
    return (
      <div className="page">
        <h1 className="page-title">Your Cart</h1>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Find your character in the catalog.</p>
          <Link className="btn btn-primary mt-16" href="/#catalog">
            BROWSE CATALOG
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Your Cart</h1>
      <p className="page-subtitle">
        Review your items. Shipping and promo are applied at checkout.
      </p>

      <div className="cart-layout">
        <div className="cart-lines">
          {items.map((i) => (
            <div className="cart-line" key={i.variantId}>
              <div className="cart-line-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.imageUrl ?? "/asset/logo.png"} alt={i.name} />
              </div>
              <div>
                <div className="cart-line-name">
                  <Link href={`/product/${i.slug}`}>{i.name}</Link>
                </div>
                <div className="cart-line-meta">
                  Size {i.size} · {formatRupiah(i.unitPrice)}
                </div>
                <div className="qty-stepper mt-8">
                  <button
                    onClick={() => setQty(i.variantId, i.quantity - 1)}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    onClick={() => setQty(i.variantId, i.quantity + 1)}
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="right">
                <div className="cart-line-price">
                  {formatRupiah(i.unitPrice * i.quantity)}
                </div>
                <button
                  className="cart-line-remove"
                  onClick={() => removeItem(i.variantId)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="summary">
          <h3>SUMMARY</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="summary-row muted">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <Link className="btn btn-primary btn-block mt-16" href="/checkout">
            PROCEED TO CHECKOUT
          </Link>
        </aside>
      </div>
    </div>
  );
}
