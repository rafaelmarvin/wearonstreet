import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/lib/types";

const FILTERS: (OrderStatus | "all")[] = [
  "all",
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
  "refunded",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data: orders } = await query.returns<Order[]>();

  return (
    <div>
      <h1 className="page-title">Orders</h1>

      <div className="mt-16" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const active = (status ?? "all") === f;
          return (
            <Link
              key={f}
              href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`}
              className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`}
            >
              {f === "all" ? "All" : ORDER_STATUS_LABELS[f]}
            </Link>
          );
        })}
      </div>

      <div className="table-wrap mt-24">
        <table className="data">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Resi</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`}>
                    {o.midtrans_order_id}
                  </Link>
                </td>
                <td>{formatDateTime(o.created_at)}</td>
                <td>{o.ship_full_name}</td>
                <td className="nowrap">{formatRupiah(o.gross_amount)}</td>
                <td>{o.tracking_number ?? "—"}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
