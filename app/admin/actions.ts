"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";
import type { OrderStatus, PromoType } from "@/lib/types";

async function assertAdmin() {
  const { profile } = await getAuthState();
  if (!profile?.is_admin) throw new Error("Not authorized");
  return await createClient();
}

const ADMIN_SETTABLE: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export async function updateOrder(formData: FormData) {
  const supabase = await assertAdmin();
  const orderId = String(formData.get("orderId"));
  const status = String(formData.get("status")) as OrderStatus;
  const tracking = String(formData.get("tracking_number") ?? "").trim();

  if (!ADMIN_SETTABLE.includes(status)) throw new Error("Invalid status");

  // RLS (ord_admin_update) enforces that only admins can write here.
  await supabase
    .from("orders")
    .update({
      status,
      tracking_number: tracking || null,
    })
    .eq("id", orderId);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function updateVariantStock(formData: FormData) {
  const supabase = await assertAdmin();
  const variantId = String(formData.get("variantId"));
  const stock = Math.max(0, Math.floor(Number(formData.get("stock")) || 0));

  await supabase
    .from("product_variants")
    .update({ stock })
    .eq("id", variantId);

  revalidatePath("/admin/products");
}

export async function setProductActive(formData: FormData) {
  const supabase = await assertAdmin();
  const productId = String(formData.get("productId"));
  const isActive = String(formData.get("is_active")) === "true";

  await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);

  revalidatePath("/admin/products");
}

export async function createPromo(formData: FormData) {
  const supabase = await assertAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type")) as PromoType;
  const value = Math.floor(Number(formData.get("value")) || 0);
  const minSubtotal = Math.max(0, Math.floor(Number(formData.get("min_subtotal")) || 0));
  const maxDiscountRaw = Number(formData.get("max_discount"));
  const totalLimitRaw = Number(formData.get("total_usage_limit"));
  const perUserRaw = Number(formData.get("per_user_limit"));
  const validUntil = String(formData.get("valid_until") ?? "").trim();

  if (!code || value <= 0) throw new Error("Code and value are required");
  if (type === "percentage" && (value < 1 || value > 100))
    throw new Error("Percentage must be 1–100");

  await supabase.from("promo_codes").insert({
    code,
    type,
    value,
    min_subtotal: minSubtotal,
    max_discount: maxDiscountRaw > 0 ? Math.floor(maxDiscountRaw) : null,
    total_usage_limit: totalLimitRaw > 0 ? Math.floor(totalLimitRaw) : null,
    per_user_limit: perUserRaw > 0 ? Math.floor(perUserRaw) : null,
    valid_until: validUntil ? new Date(validUntil).toISOString() : null,
  });

  revalidatePath("/admin/promos");
}

export async function setPromoActive(formData: FormData) {
  const supabase = await assertAdmin();
  const promoId = String(formData.get("promoId"));
  const isActive = String(formData.get("is_active")) === "true";

  await supabase
    .from("promo_codes")
    .update({ is_active: isActive })
    .eq("id", promoId);

  revalidatePath("/admin/promos");
}

export async function deletePromo(formData: FormData) {
  const supabase = await assertAdmin();
  const promoId = String(formData.get("promoId"));

  // Will fail if the code has redemptions (FK) — disable it instead in that case.
  const { error } = await supabase.from("promo_codes").delete().eq("id", promoId);
  if (error) {
    await supabase
      .from("promo_codes")
      .update({ is_active: false })
      .eq("id", promoId);
  }

  revalidatePath("/admin/promos");
}
