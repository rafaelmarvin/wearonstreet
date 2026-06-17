import { redirect } from "next/navigation";
import CheckoutClient from "@/components/CheckoutClient";
import { requireUser } from "@/lib/auth";
import { resolveShippingFee } from "@/lib/shipping";
import { MIDTRANS_CLIENT_KEY, MIDTRANS_IS_SANDBOX } from "@/lib/env";

export default async function CheckoutPage() {
  const { profile } = await requireUser("/checkout");
  if (!profile) redirect("/account/profile?redirect=/checkout");

  const shippingFee = resolveShippingFee(
    profile.province_code,
    profile.city_name,
  );

  const snapJsUrl = MIDTRANS_IS_SANDBOX
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";

  return (
    <div className="page">
      <h1 className="page-title">Checkout</h1>
      <p className="page-subtitle">Review your order and pay securely.</p>
      <CheckoutClient
        profile={{
          full_name: profile.full_name,
          phone: profile.phone,
          province_name: profile.province_name,
          city_name: profile.city_name,
          address_line: profile.address_line,
        }}
        shippingFee={shippingFee}
        snapJsUrl={snapJsUrl}
        clientKey={MIDTRANS_CLIENT_KEY}
      />
    </div>
  );
}
