// Shipping fee resolver — THE upgrade seam.
//
// Current policy (flat, tiered by destination):
//   Rp 10.000  — JABODETABEK + Jawa Barat
//                (DKI Jakarta, Jawa Barat, and Tangerang/Tangerang Selatan in Banten)
//   Rp 20.000  — everywhere else in Indonesia
//
// To switch to live courier rates later (Komerce/RajaOngkir), replace the body
// of resolveShippingFee() with an API call. Nothing else in the app needs to change:
// checkout, the order schema, and the admin panel all stay the same.

export const SHIPPING_FEE_NEAR = 10000; // JABODETABEK + Jawa Barat
export const SHIPPING_FEE_FAR = 20000; // rest of Indonesia

// Province codes that always qualify for the near (Rp 10k) tier.
const NEAR_PROVINCE_CODES = new Set([
  "31", // DKI Jakarta
  "32", // Jawa Barat (covers Bogor, Depok, Bekasi)
]);

/**
 * Decide the flat shipping fee from the destination province (+ a Tangerang
 * special case in Banten, which is part of JABODETABEK).
 *
 * @param provinceCode BPS province code (see lib/regions.ts)
 * @param cityName     free-text city/regency (used only for the Tangerang case)
 */
export function resolveShippingFee(
  provinceCode: string,
  cityName: string | null | undefined,
): number {
  if (NEAR_PROVINCE_CODES.has(provinceCode)) return SHIPPING_FEE_NEAR;

  // Banten: only Tangerang / Tangerang Selatan are JABODETABEK.
  if (provinceCode === "36") {
    const c = (cityName ?? "").toLowerCase();
    if (c.includes("tangerang")) return SHIPPING_FEE_NEAR;
  }

  return SHIPPING_FEE_FAR;
}
