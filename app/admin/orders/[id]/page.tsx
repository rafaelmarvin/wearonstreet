import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { updateOrder } from "@/app/admin/actions";
import type { Order, OrderItem } from "@/lib/types";

const SETTABLE_STATUSES = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<Order>();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .returns<OrderItem[]>();

  return (
    <div>
      <div className="crumb">
        <Link href="/admin/orders">ORDERS</Link> / {order.midtrans_order_id}
      </div>
      <div className="flex-between">
        <h1 className="page-title">{order.midtrans_order_id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="page-subtitle">Placed {formatDateTime(order.created_at)}</p>

      <div className="card">
        <h2>Customer & shipping</h2>
        <div className="muted" style={{ lineHeight: 1.9 }}>
          <div>
            <strong style={{ color: "var(--text-color)" }}>
              {order.ship_full_name}
            </strong>{" "}
            · {order.ship_phone}
          </div>
          <div>
            {order.ship_address_line}, {order.ship_city_name},{" "}
            {order.ship_province_name}
          </div>
          {order.payment_method && <div>Payment: {order.payment_method}</div>}
          {order.paid_at && <div>Paid at: {formatDateTime(order.paid_at)}</div>}
        </div>
      </div>

      <div className="card">
        <h2>Items</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr key={it.id}>
                  <td>{it.product_name}</td>
                  <td>{it.size}</td>
                  <td>{it.quantity}</td>
                  <td className="nowrap">{formatRupiah(it.unit_price)}</td>
                  <td className="nowrap">{formatRupiah(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-16" style={{ maxWidth: 320, marginLeft: "auto" }}>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="summary-row discount">
              <span>Discount</span>
              <span>−{formatRupiah(order.discount_amount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Shipping</span>
            <span>{formatRupiah(order.shipping_fee)}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span>{formatRupiah(order.gross_amount)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Update fulfillment</h2>
        <form action={updateOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <div className="field-row">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={
                SETTABLE_STATUSES.includes(
                  order.status as (typeof SETTABLE_STATUSES)[number],
                )
                  ? order.status
                  : "paid"
              }>
                {SETTABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tracking_number">Tracking number (resi)</label>
              <input
                id="tracking_number"
                name="tracking_number"
                defaultValue={order.tracking_number ?? ""}
                placeholder="JNE / courier AWB"
              />
            </div>
          </div>
          <button className="btn btn-primary">SAVE</button>
        </form>
        <p className="field-hint mt-8">
          Set status to <strong>shipped</strong> and paste the resi — the customer
          sees it in their account immediately.
        </p>
      </div>
    </div>
  );
}
