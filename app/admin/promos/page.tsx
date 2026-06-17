import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  createPromo,
  deletePromo,
  setPromoActive,
} from "@/app/admin/actions";
import type { PromoCode } from "@/lib/types";

export default async function AdminPromosPage() {
  const supabase = await createClient();
  const { data: promos } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PromoCode[]>();

  return (
    <div>
      <h1 className="page-title">Promo Codes</h1>
      <p className="page-subtitle">
        Discounts validated and consumed server-side at checkout.
      </p>

      <div className="card">
        <h2>Create a code</h2>
        <form action={createPromo}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="code">Code</label>
              <input id="code" name="code" required placeholder="WELCOME10" />
            </div>
            <div className="field">
              <label htmlFor="type">Type</label>
              <select id="type" name="type" defaultValue="percentage">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (Rp)</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="value">Value</label>
              <input
                id="value"
                name="value"
                type="number"
                min={1}
                required
                placeholder="10 (%) or 20000 (Rp)"
              />
            </div>
            <div className="field">
              <label htmlFor="min_subtotal">Min. subtotal (Rp)</label>
              <input
                id="min_subtotal"
                name="min_subtotal"
                type="number"
                min={0}
                defaultValue={0}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="max_discount">Max discount (Rp, for %)</label>
              <input
                id="max_discount"
                name="max_discount"
                type="number"
                min={0}
                placeholder="optional"
              />
            </div>
            <div className="field">
              <label htmlFor="valid_until">Valid until</label>
              <input id="valid_until" name="valid_until" type="date" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="total_usage_limit">Total usage limit</label>
              <input
                id="total_usage_limit"
                name="total_usage_limit"
                type="number"
                min={0}
                placeholder="blank = unlimited"
              />
            </div>
            <div className="field">
              <label htmlFor="per_user_limit">Per-user limit</label>
              <input
                id="per_user_limit"
                name="per_user_limit"
                type="number"
                min={0}
                placeholder="blank = unlimited"
              />
            </div>
          </div>
          <button className="btn btn-primary">CREATE CODE</button>
        </form>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min</th>
              <th>Used</th>
              <th>Valid until</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(promos ?? []).map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.code}</strong>
                </td>
                <td>
                  {p.type === "percentage"
                    ? `${p.value}%${p.max_discount ? ` (max ${formatRupiah(p.max_discount)})` : ""}`
                    : formatRupiah(p.value)}
                </td>
                <td>{p.min_subtotal > 0 ? formatRupiah(p.min_subtotal) : "—"}</td>
                <td>
                  {p.used_count}
                  {p.total_usage_limit ? ` / ${p.total_usage_limit}` : ""}
                </td>
                <td>{p.valid_until ? formatDate(p.valid_until) : "—"}</td>
                <td>
                  <span
                    className={`badge ${p.is_active ? "badge-delivered" : "badge-cancelled"}`}
                  >
                    {p.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="nowrap">
                  <form action={setPromoActive} style={{ display: "inline" }}>
                    <input type="hidden" name="promoId" value={p.id} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={(!p.is_active).toString()}
                    />
                    <button className="btn btn-outline btn-sm">
                      {p.is_active ? "Disable" : "Enable"}
                    </button>
                  </form>{" "}
                  <form action={deletePromo} style={{ display: "inline" }}>
                    <input type="hidden" name="promoId" value={p.id} />
                    <button className="btn btn-danger btn-sm">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {(promos ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No promo codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
