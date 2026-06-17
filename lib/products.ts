import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CATALOG, type CatalogEntry } from "@/lib/catalog";
import type { Product, ProductWithVariants } from "@/lib/types";

function catalogToProduct(c: CatalogEntry): Product {
  return {
    id: c.slug,
    slug: c.slug,
    name: c.name,
    category: c.category,
    description: c.about,
    base_price: c.basePrice,
    image_url: c.cardImage,
    detail_image_url: c.detailImage,
    weight_grams: c.weightGrams,
    is_active: true,
  };
}

/** Active products for the catalog. Falls back to static content when Supabase
 *  is not yet configured (visual preview only — checkout needs the DB). */
export async function getProducts(): Promise<{
  products: Product[];
  configured: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return { products: CATALOG.map(catalogToProduct), configured: false };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return { products: CATALOG.map(catalogToProduct), configured: true };
  }
  return { products: data as Product[], configured: true };
}

/** A single product with its size variants (stock). Returns null if not found. */
export async function getProductBySlug(
  slug: string,
): Promise<ProductWithVariants | null> {
  if (!isSupabaseConfigured()) {
    const c = CATALOG.find((x) => x.slug === slug);
    if (!c) return null;
    return { ...catalogToProduct(c), variants: [] };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const variants = (data.variants ?? []).filter(
    (v: { is_active: boolean }) => v.is_active,
  );
  const sizeOrder = { S: 0, M: 1, L: 2, XL: 3 } as const;
  variants.sort(
    (a: { size: keyof typeof sizeOrder }, b: { size: keyof typeof sizeOrder }) =>
      sizeOrder[a.size] - sizeOrder[b.size],
  );

  return { ...(data as Product), variants } as ProductWithVariants;
}
