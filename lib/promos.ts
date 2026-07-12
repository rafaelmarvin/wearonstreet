import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatRupiah } from "@/lib/format";
import type { HomeBanner, PromoCode } from "@/lib/types";

/** Banner shown before Supabase is wired up (matches the original static site). */
const FALLBACK_BANNER: HomeBanner = {
  title: "SPECIAL DISCOUNT",
  description:
    "Shopping online? Enter code WEARONWEB at checkout and take 20% off your order. Web exclusive — don't miss out!",
};

/** Default banner copy derived from the promo itself, so an admin can feature a
 *  code without writing any marketing text. */
export function describePromo(promo: PromoCode): string {
  const off =
    promo.type === "percentage"
      ? `${promo.value}% off`
      : `${formatRupiah(promo.value)} off`;

  let text = `Enter code ${promo.code} at checkout and take ${off} your order.`;
  if (promo.type === "percentage" && promo.max_discount) {
    text += ` Max discount ${formatRupiah(promo.max_discount)}.`;
  }
  if (promo.min_subtotal > 0) {
    text += ` Minimum spend ${formatRupiah(promo.min_subtotal)}.`;
  }
  return text;
}

/** The promo an admin has chosen to advertise on the home page, or null when the
 *  banner is turned off. Only the featured + active row is readable by clients
 *  (RLS policy promo_home_read); every other code stays server-side only. */
export async function getHomeBanner(): Promise<HomeBanner | null> {
  if (!isSupabaseConfigured()) return FALLBACK_BANNER;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("show_on_home", true)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<PromoCode>();

  // Before migration 0005 the column does not exist — keep the old banner.
  if (error) return FALLBACK_BANNER;
  if (!data) return null;

  return {
    title: data.home_title?.trim() || "SPECIAL DISCOUNT",
    description: data.home_description?.trim() || describePromo(data),
  };
}
