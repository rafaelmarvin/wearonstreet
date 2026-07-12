import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/format";
import { describePromo } from "@/lib/promos";
import AdminAlert from "@/components/AdminAlert";
import ConfirmButton from "@/components/ConfirmButton";
import {
  createPromo,
  updatePromo,
  deletePromo,
  setPromoActive,
  setHomeBanner,
} from "@/app/admin/actions";
import type { PromoCode } from "@/lib/types";

/** yyyy-mm-dd for <input type="date"> */
function dateValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export default async function AdminPromosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ok?: string; error?: string }>;
}) {
  const { edit, ok, error } = await searchParams;

  const supabase = await createClient();
  const { data: promos } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PromoCode[]>();

  const all = promos ?? [];
  const editing = edit ? all.find((p) => p.id === edit) : undefined;
  const featured = all.find((p) => p.show_on_home);

  return (
    <div>
      <h1 className="page-title">Promo Codes</h1>
      <p className="page-subtitle">
        Discounts validated and consumed server-side at checkout.
      </p>

      <AdminAlert ok={ok} error={error} />

      {/* ---------- Home page banner ---------- */}
      <div className="card">
        <h2>Home page discount banner</h2>
        <p className="field-hint" style={{ marginBottom: 16 }}>
          Pick which code is advertised in the discount section of the home page.
          Only one code can be featured at a time.
        </p>

        <form action={setHomeBanner}>
          <div className="field">
            <label htmlFor="promoId">Featured code</label>
            <select
              id="promoId"
              name="promoId"
              defaultValue={featured?.id ?? ""}
              key={featured?.id ?? "none"}
            >
              <option value="">— No banner (hide the section) —</option>
              {all
                .filter((p) => p.is_active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} ·{" "}
                    {p.type === "percentage"
                      ? `${p.value}%`
                      : formatRupiah(p.value)}
                  </option>
                ))}
            </select>
            <span className="field-hint">
              Disabled codes can&apos;t be featured — enable them first.
            </span>
          </div>

          <div className="field">
            <label htmlFor="home_title">Banner headline</label>
            <input
              id="home_title"
              name="home_title"
              defaultValue={featured?.home_title ?? ""}
              placeholder="SPECIAL DISCOUNT"
              key={`t-${featured?.id ?? "none"}`}
            />
          </div>

          <div className="field">
            <label htmlFor="home_description">Banner text</label>
            <textarea
              id="home_description"
              name="home_description"
              defaultValue={featured?.home_description ?? ""}
              placeholder={
                featured
                  ? describePromo(featured)
                  : "Leave blank to generate the text from the code automatically."
              }
              key={`d-${featured?.id ?? "none"}`}
            />
            <span className="field-hint">
              Leave blank to generate it from the code automatically.
            </span>
          </div>

          <button className="btn btn-primary">SAVE BANNER</button>
        </form>

        {featured && (
          <div className="banner-preview">
            <span className="banner-preview__label">Home page preview</span>
            <strong>{featured.home_title?.trim() || "SPECIAL DISCOUNT"}</strong>
            <p>{featured.home_description?.trim() || describePromo(featured)}</p>
          </div>
        )}
      </div>

      {/* ---------- Create / edit ---------- */}
      <div className="card">
        <h2>{editing ? `Edit ${editing.code}` : "Create a code"}</h2>
        <form action={editing ? updatePromo : createPromo} key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="promoId" value={editing.id} />}

          <div className="field-row">
            <div className="field">
              <label htmlFor="code">Code</label>
              <input
                id="code"
                name="code"
                required
                placeholder="WELCOME10"
                defaultValue={editing?.code ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                name="type"
                defaultValue={editing?.type ?? "percentage"}
              >
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
                defaultValue={editing?.value ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="min_subtotal">Min. subtotal (Rp)</label>
              <input
                id="min_subtotal"
                name="min_subtotal"
                type="number"
                min={0}
                defaultValue={editing?.min_subtotal ?? 0}
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
                defaultValue={editing?.max_discount ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="valid_until">Valid until</label>
              <input
                id="valid_until"
                name="valid_until"
                type="date"
                defaultValue={dateValue(editing?.valid_until ?? null)}
              />
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
                defaultValue={editing?.total_usage_limit ?? ""}
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
                defaultValue={editing?.per_user_limit ?? ""}
              />
            </div>
          </div>

          <div className="inline-form">
            <button className="btn btn-primary">
              {editing ? "SAVE CHANGES" : "CREATE CODE"}
            </button>
            {editing && (
              <Link className="btn btn-outline" href="/admin/promos">
                CANCEL
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* ---------- All codes ---------- */}
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
            {all.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.code}</strong>
                  {p.show_on_home && (
                    <span className="badge badge-paid" style={{ marginLeft: 8 }}>
                      On home
                    </span>
                  )}
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
                  <Link
                    className="btn btn-outline btn-sm"
                    href={`/admin/promos?edit=${p.id}`}
                  >
                    Edit
                  </Link>{" "}
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
                    <ConfirmButton message={`Delete promo code ${p.code}?`}>
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {all.length === 0 && (
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
