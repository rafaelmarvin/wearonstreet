"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatRupiah } from "@/lib/format";
import type { ProductWithVariants, ProductVariant } from "@/lib/types";

export default function AddToCart({ product }: { product: ProductWithVariants }) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const hasVariants = product.variants.length > 0;
  const maxQty = selected ? selected.stock : 0;

  function unitPrice(v: ProductVariant): number {
    return v.price ?? product.base_price;
  }

  function handleAdd() {
    if (!selected) return;
    addItem({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size: selected.size,
      unitPrice: unitPrice(selected),
      imageUrl: product.image_url,
      quantity: Math.min(qty, selected.stock),
    });
    setAdded(true);
  }

  if (!hasVariants) {
    return (
      <div className="alert alert-warn">
        This product isn&apos;t available for online checkout yet. Connect Supabase
        and seed the catalog to enable purchasing.
      </div>
    );
  }

  return (
    <div className="pdp-buy">
      <div className="field">
        <span className="size-label">Select size</span>
        <div className="size-options">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`size-chip${selected?.id === v.id ? " active" : ""}`}
              disabled={v.stock <= 0}
              onClick={() => {
                setSelected(v);
                setQty(1);
                setAdded(false);
              }}
              title={v.stock <= 0 ? "Sold out" : `${v.stock} in stock`}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <div className="qty-row">
            <div className="qty-stepper">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease"
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                aria-label="Increase"
              >
                +
              </button>
            </div>
            <span className="stock-note">{selected.stock} in stock</span>
          </div>
          <p className="pdp-price">{formatRupiah(unitPrice(selected) * qty)}</p>
        </>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!selected}
        onClick={handleAdd}
      >
        ADD TO CART
      </button>

      {added && (
        <div className="alert alert-success mt-16">
          Added to cart. <Link href="/cart">View cart →</Link>
        </div>
      )}
    </div>
  );
}
