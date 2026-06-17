import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const REVENUE_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: allOrders } = await supabase
    .from("orders")
    .select("status, gross_amount")
    .returns<Pick<Order, "status" | "gross_amount">[]>();

  const orders = allOrders ?? [];
  const revenue = orders
    .filter((o) => REVENUE_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.gross_amount, 0);
  const paidCount = orders.filter((o) =>
    REVENUE_STATUSES.includes(o.status),
  ).length;
  const pendingCount = orders.filter(
    (o) => o.status === "pending_payment",
  ).length;
  const toShip = orders.filter(
    (o) => o.status === "paid" || o.status === "processing",
  ).length;

  const { data: cartRows } = await supabase.from("cart_items").select("user_id");
  const activeCarts = new Set((cartRows ?? []).map((c) => c.user_id)).size;

  const { data: recent } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<Order[]>();

  const { data: lowStock } = await supabase
    .from("product_variants")
    .select("size, stock, product:products(name)")
    .lte("stock", 5)
    .order("stock", { ascending: true })
    .limit(10);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Sales overview and recent activity.</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Revenue (paid)</div>
          <div className="value">{formatRupiah(revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Paid orders</div>
          <div className="value">{paidCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Awaiting payment</div>
          <div className="value">{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">To fulfill</div>
          <div className="value">{toShip}</div>
        </div>
        <div className="stat-card">
          <div className="label">
            <Link href="/admin/carts">Active carts</Link>
          </div>
          <div className="value">{activeCarts}</div>
        </div>
      </div>

      <div className="flex-between">
        <h2 style={{ fontSize: 18 }}>Recent orders</h2>
        <Link className="btn btn-outline btn-sm" href="/admin/orders">
          VIEW ALL
        </Link>
      </div>
      <div className="table-wrap mt-16">
        <table className="data">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`}>
                    {o.midtrans_order_id}
                  </Link>
                </td>
                <td>{formatDateTime(o.created_at)}</td>
                <td>{o.ship_full_name}</td>
                <td className="nowrap">{formatRupiah(o.gross_amount)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
            {(recent ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Low stock (≤ 5)</h2>
      <div className="table-wrap mt-16">
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {(lowStock ?? []).map((v, i) => {
              const productName =
                (v as { product?: { name?: string } }).product?.name ?? "—";
              return (
                <tr key={i}>
                  <td>{productName}</td>
                  <td>{(v as { size: string }).size}</td>
                  <td>{(v as { stock: number }).stock}</td>
                </tr>
              );
            })}
            {(lowStock ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  All variants well stocked.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
