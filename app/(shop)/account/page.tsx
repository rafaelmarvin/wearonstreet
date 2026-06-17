import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import StatusBadge from "@/components/StatusBadge";
import SyncPaymentButton from "@/components/SyncPaymentButton";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

type OrderWithItems = Order & { items: OrderItem[] };

async function getMyOrders(): Promise<OrderWithItems[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .order("created_at", { ascending: false });
  return (data as OrderWithItems[] | null) ?? [];
}

export default async function AccountPage() {
  const { email, profile } = await requireUser("/account");
  const orders = await getMyOrders();

  return (
    <div className="page">
      <div className="flex-between">
        <h1 className="page-title">My Account</h1>
        <SignOutButton />
      </div>

      {!profile && (
        <div className="alert alert-warn">
          Complete your profile (name, phone, address) before you can checkout.{" "}
          <Link href="/account/profile">Complete now →</Link>
        </div>
      )}

      <div className="card">
        <div className="flex-between">
          <h2>Profile</h2>
          <Link className="btn btn-outline btn-sm" href="/account/profile">
            EDIT
          </Link>
        </div>
        {profile ? (
          <div className="muted" style={{ lineHeight: 1.9 }}>
            <div>
              <strong style={{ color: "var(--text-color)" }}>
                {profile.full_name}
              </strong>{" "}
              · {email}
            </div>
            <div>{profile.phone}</div>
            <div>
              {profile.address_line}, {profile.city_name},{" "}
              {profile.province_name}
            </div>
          </div>
        ) : (
          <p className="muted">No profile yet.</p>
        )}
      </div>

      <h2 className="mt-24" style={{ marginBottom: 16 }}>
        Order History
      </h2>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders yet.</p>
          <Link className="btn btn-primary mt-16" href="/#catalog">
            START SHOPPING
          </Link>
        </div>
      ) : (
        orders.map((o) => (
          <div className="order-card" key={o.id}>
            <div>
              <div className="meta">
                <strong>#{o.midtrans_order_id}</strong> · {formatDateTime(o.created_at)}
              </div>
              <div className="mt-8">
                {o.items?.map((it) => (
                  <div className="meta" key={it.id}>
                    {it.quantity}× {it.product_name} ({it.size})
                  </div>
                ))}
              </div>
              {o.tracking_number && (
                <div className="meta mt-8">
                  Resi: <strong>{o.tracking_number}</strong>
                </div>
              )}
            </div>
            <div className="right">
              <StatusBadge status={o.status} />
              <div className="cart-line-price mt-8">
                {formatRupiah(o.gross_amount)}
              </div>
              {o.status === "pending_payment" && (
                <>
                  {o.snap_redirect_url && (
                    <a
                      className="btn btn-primary btn-sm mt-8"
                      href={o.snap_redirect_url}
                    >
                      PAY NOW
                    </a>
                  )}
                  <SyncPaymentButton orderId={o.id} />
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
