"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";
import { ALL_SIZES } from "@/lib/catalog";
import {
  deleteProductImages,
  removeUploads,
  uploadProductImage,
} from "@/lib/storage";
import type { OrderStatus, PromoType } from "@/lib/types";

async function assertAdmin() {
  const { profile } = await getAuthState();
  if (!profile?.is_admin) throw new Error("Not authorized");
  return await createClient();
}

/** Bounce back to an admin page with a message banner. `redirect` throws, so
 *  never call this inside a try/catch that swallows the exception. */
function back(path: string, kind: "ok" | "error", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Shared parse + validation for the promo create/edit forms. The same rules the
 *  DB enforces (see the promo_codes check constraints), reported as friendly text. */
function readPromoForm(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type")) as PromoType;
  const value = Math.floor(Number(formData.get("value")) || 0);
  const maxDiscountRaw = Number(formData.get("max_discount"));
  const totalLimitRaw = Number(formData.get("total_usage_limit"));
  const perUserRaw = Number(formData.get("per_user_limit"));
  const validUntil = String(formData.get("valid_until") ?? "").trim();

  let error: string | null = null;
  if (!code || value <= 0) error = "Code and value are required.";
  else if (type !== "percentage" && type !== "fixed")
    error = "Invalid discount type.";
  else if (type === "percentage" && (value < 1 || value > 100))
    error = "Percentage must be between 1 and 100.";

  return {
    error,
    values: {
      code,
      type,
      value,
      min_subtotal: Math.max(
        0,
        Math.floor(Number(formData.get("min_subtotal")) || 0),
      ),
      max_discount: maxDiscountRaw > 0 ? Math.floor(maxDiscountRaw) : null,
      total_usage_limit: totalLimitRaw > 0 ? Math.floor(totalLimitRaw) : null,
      per_user_limit: perUserRaw > 0 ? Math.floor(perUserRaw) : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    },
  };
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

/** Add a product plus one variant per size, with the starting stock from the form. */
export async function createProduct(formData: FormData) {
  const supabase = await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = toSlug(String(formData.get("slug") ?? "").trim() || name);
  const category = String(formData.get("category") ?? "").trim() || "T-SHIRT";
  const description = String(formData.get("description") ?? "").trim();
  const basePrice = Math.floor(Number(formData.get("base_price")) || 0);
  const weight = Math.floor(Number(formData.get("weight_grams")) || 250);

  if (!name) back("/admin/products", "error", "Product name is required.");
  if (!slug)
    back("/admin/products", "error", "Could not build a slug — enter one manually.");
  if (basePrice <= 0) back("/admin/products", "error", "Price must be greater than 0.");
  if (weight <= 0) back("/admin/products", "error", "Weight must be greater than 0.");

  const productImage = formData.get("image_file");
  const characterImage = formData.get("detail_image_file");
  if (!(productImage instanceof File) || productImage.size === 0)
    back("/admin/products", "error", "Choose a product image before saving.");

  // Uploaded images are stored under the slug, so reject a duplicate slug BEFORE
  // uploading — otherwise we'd write into the existing product's folder.
  const { data: clash } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (clash) {
    back(
      "/admin/products",
      "error",
      `The URL slug "${slug}" is already used by another product. Give this one a different name or slug.`,
    );
  }

  const shot = await uploadProductImage(productImage, slug, "product");
  if (shot.error) back("/admin/products", "error", shot.error);

  const art = await uploadProductImage(
    characterImage instanceof File ? characterImage : null,
    slug,
    "character",
  );
  if (art.error) {
    await removeUploads([shot.path]);
    back("/admin/products", "error", art.error);
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      slug,
      name,
      category,
      description: description || null,
      base_price: basePrice,
      image_url: shot.url,
      detail_image_url: art.url,
      weight_grams: weight,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !product) {
    await removeUploads([shot.path, art.path]);
    back(
      "/admin/products",
      "error",
      error?.message ?? "Could not create the product.",
    );
  }

  const variants = ALL_SIZES.map((size) => ({
    product_id: product.id,
    size,
    stock: Math.max(0, Math.floor(Number(formData.get(`stock_${size}`)) || 0)),
  }));

  const { error: variantError } = await supabase
    .from("product_variants")
    .insert(variants);

  if (variantError) {
    // Don't leave a product with no sizes behind.
    await supabase.from("products").delete().eq("id", product.id);
    await removeUploads([shot.path, art.path]);
    back("/admin/products", "error", `Could not create sizes: ${variantError.message}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  back("/admin/products", "ok", `${name} added.`);
}

export async function deleteProduct(formData: FormData) {
  const supabase = await assertAdmin();
  const productId = String(formData.get("productId"));
  const name = String(formData.get("name") ?? "Product");

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  // Sizes cascade with the product, but order_items reference it — a product
  // that has ever been bought cannot be deleted without destroying order history.
  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    back(
      "/admin/products",
      "error",
      error.code === "23503"
        ? `${name} already appears in customer orders, so it can't be deleted. Hide it from the store instead.`
        : error.message,
    );
  }

  if (product?.slug) await deleteProductImages(product.slug);

  revalidatePath("/admin/products");
  revalidatePath("/");
  back("/admin/products", "ok", `${name} deleted.`);
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
  const parsed = readPromoForm(formData);
  if (parsed.error) back("/admin/promos", "error", parsed.error);

  const { error } = await supabase.from("promo_codes").insert(parsed.values);
  if (error) {
    back(
      "/admin/promos",
      "error",
      error.code === "23505"
        ? `Code ${parsed.values.code} already exists.`
        : error.message,
    );
  }

  revalidatePath("/admin/promos");
  back("/admin/promos", "ok", `Code ${parsed.values.code} created.`);
}

export async function updatePromo(formData: FormData) {
  const supabase = await assertAdmin();
  const promoId = String(formData.get("promoId"));
  const parsed = readPromoForm(formData);
  if (parsed.error) back("/admin/promos", "error", parsed.error);

  const { error } = await supabase
    .from("promo_codes")
    .update(parsed.values)
    .eq("id", promoId);

  if (error) {
    back(
      "/admin/promos",
      "error",
      error.code === "23505"
        ? `Code ${parsed.values.code} already exists.`
        : error.message,
    );
  }

  revalidatePath("/admin/promos");
  revalidatePath("/"); // the code may be the one on the home banner
  back("/admin/promos", "ok", `Code ${parsed.values.code} updated.`);
}

/** Choose which promo (if any) is advertised on the home page. At most one is
 *  featured, so clear the current pick before setting the new one. */
export async function setHomeBanner(formData: FormData) {
  const supabase = await assertAdmin();
  const promoId = String(formData.get("promoId") ?? "").trim();
  const title = String(formData.get("home_title") ?? "").trim();
  const description = String(formData.get("home_description") ?? "").trim();

  // Validate the new pick BEFORE clearing the old one, so a bad request can't
  // leave the home page with no banner.
  if (promoId) {
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("code, is_active")
      .eq("id", promoId)
      .maybeSingle();

    if (!promo) back("/admin/promos", "error", "That promo code no longer exists.");
    if (!promo.is_active) {
      back(
        "/admin/promos",
        "error",
        `${promo.code} is disabled — enable it before featuring it on the home page.`,
      );
    }
  }

  const { error: clearError } = await supabase
    .from("promo_codes")
    .update({ show_on_home: false })
    .eq("show_on_home", true);
  if (clearError) back("/admin/promos", "error", clearError.message);

  if (!promoId) {
    revalidatePath("/admin/promos");
    revalidatePath("/");
    back("/admin/promos", "ok", "Home page discount banner hidden.");
  }

  const { error } = await supabase
    .from("promo_codes")
    .update({
      show_on_home: true,
      home_title: title || null,
      home_description: description || null,
    })
    .eq("id", promoId);

  if (error) back("/admin/promos", "error", error.message);

  revalidatePath("/admin/promos");
  revalidatePath("/");
  back("/admin/promos", "ok", "Home page discount banner updated.");
}

export async function setPromoActive(formData: FormData) {
  const supabase = await assertAdmin();
  const promoId = String(formData.get("promoId"));
  const isActive = String(formData.get("is_active")) === "true";

  // A disabled code must not stay on the home page.
  await supabase
    .from("promo_codes")
    .update(isActive ? { is_active: true } : { is_active: false, show_on_home: false })
    .eq("id", promoId);

  revalidatePath("/admin/promos");
  revalidatePath("/");
}

export async function deletePromo(formData: FormData) {
  const supabase = await assertAdmin();
  const promoId = String(formData.get("promoId"));

  // Will fail if the code has redemptions (FK) — disable it instead in that case,
  // so order history keeps pointing at a real row.
  const { error } = await supabase.from("promo_codes").delete().eq("id", promoId);

  if (error) {
    await supabase
      .from("promo_codes")
      .update({ is_active: false, show_on_home: false })
      .eq("id", promoId);

    revalidatePath("/admin/promos");
    revalidatePath("/");
    back(
      "/admin/promos",
      "ok",
      "That code has already been redeemed, so it can't be deleted — it has been disabled instead.",
    );
  }

  revalidatePath("/admin/promos");
  revalidatePath("/");
  back("/admin/promos", "ok", "Promo code deleted.");
}
