import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatRupiah } from "@/lib/format";

interface CartRow {
  user_id: string;
  quantity: number;
  updated_at: string;
  variant: {
    size: string;
    price: number | null;
    product: { name: string; base_price: number; image_url: string | null } | null;
  } | null;
}

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string;
}

function unitPrice(r: CartRow): number {
  return r.variant?.price ?? r.variant?.product?.base_price ?? 0;
}

export default async function AdminCartsPage() {
  const supabase = await createClient();

  const { data: rowsData } = await supabase
    .from("cart_items")
    .select(
      "user_id, quantity, updated_at, variant:product_variants(size, price, product:products(name, base_price, image_url))",
    )
    .order("updated_at", { ascending: false })
    .returns<CartRow[]>();

  const rows = rowsData ?? [];

  // Group rows by customer (PostgREST can't embed profiles here — no FK — so map manually).
  const groups = new Map<
    string,
    { items: CartRow[]; total: number; units: number; updatedAt: string }
  >();
  for (const r of rows) {
    const g =
      groups.get(r.user_id) ?? {
        items: [],
        total: 0,
        units: 0,
        updatedAt: r.updated_at,
      };
    g.items.push(r);
    g.total += unitPrice(r) * r.quantity;
    g.units += r.quantity;
    if (r.updated_at > g.updatedAt) g.updatedAt = r.updated_at;
    groups.set(r.user_id, g);
  }

  const userIds = [...groups.keys()];
  let profiles = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds)
      .returns<ProfileRow[]>();
    profiles = new Map((profData ?? []).map((p) => [p.id, p]));
  }

  const carts = [...groups.entries()].sort((a, b) =>
    a[1].updatedAt < b[1].updatedAt ? 1 : -1,
  );
  const totalUnits = carts.reduce((s, [, g]) => s + g.units, 0);
  const totalValue = carts.reduce((s, [, g]) => s + g.total, 0);

  return (
    <div>
      <h1 className="page-title">Live Carts</h1>
      <p className="page-subtitle">
        What logged-in customers currently have in their cart (before checkout).
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Active carts</div>
          <div className="value">{carts.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Items in carts</div>
          <div className="value">{totalUnits}</div>
        </div>
        <div className="stat-card">
          <div className="label">Potential value</div>
          <div className="value">{formatRupiah(totalValue)}</div>
        </div>
      </div>

      {carts.length === 0 ? (
        <div className="empty-state">
          <p>No active carts right now.</p>
          <p className="field-hint">
            Carts appear here as logged-in customers add items. Anonymous (not
            logged-in) carts are not tracked.
          </p>
        </div>
      ) : (
        carts.map(([userId, g]) => {
          const customer = profiles.get(userId);
          return (
            <div className="card" key={userId}>
              <div className="flex-between">
                <h2 style={{ margin: 0 }}>
                  {customer?.full_name ?? "Customer"}{" "}
                  <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                    · {customer?.phone ?? "no phone"}
                  </span>
                </h2>
                <span className="muted" style={{ fontSize: 12 }}>
                  updated {formatDateTime(g.updatedAt)}
                </span>
              </div>

              <div className="table-wrap mt-16">
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
                    {g.items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.variant?.product?.name ?? "—"}</td>
                        <td>{it.variant?.size ?? "—"}</td>
                        <td>{it.quantity}</td>
                        <td className="nowrap">{formatRupiah(unitPrice(it))}</td>
                        <td className="nowrap">
                          {formatRupiah(unitPrice(it) * it.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="right mt-8">
                <strong>Cart total: {formatRupiah(g.total)}</strong>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
