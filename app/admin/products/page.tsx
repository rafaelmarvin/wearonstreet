import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { setProductActive, updateVariantStock } from "@/app/admin/actions";
import type { Product, ProductVariant } from "@/lib/types";

type ProductWithVariants = Product & { variants: ProductVariant[] };

const SIZE_ORDER = { S: 0, M: 1, L: 2, XL: 3 } as const;

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .order("created_at", { ascending: true })
    .returns<ProductWithVariants[]>();

  const products = data ?? [];

  return (
    <div>
      <h1 className="page-title">Products & Stock</h1>
      <p className="page-subtitle">
        Update per-size stock. Set a product inactive to hide it from the store.
      </p>

      {products.map((p) => {
        const variants = [...(p.variants ?? [])].sort(
          (a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size],
        );
        return (
          <div className="card" key={p.id}>
            <div className="flex-between">
              <h2 style={{ margin: 0 }}>
                {p.name}{" "}
                <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                  · {formatRupiah(p.base_price)}
                </span>
              </h2>
              <form action={setProductActive}>
                <input type="hidden" name="productId" value={p.id} />
                <input
                  type="hidden"
                  name="is_active"
                  value={(!p.is_active).toString()}
                />
                <button
                  className={`btn btn-sm ${p.is_active ? "btn-outline" : "btn-primary"}`}
                >
                  {p.is_active ? "Active — click to hide" : "Hidden — click to show"}
                </button>
              </form>
            </div>

            <div className="table-wrap mt-16">
              <table className="data">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Stock</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.size}</strong>
                      </td>
                      <td>{v.stock}</td>
                      <td>
                        <form action={updateVariantStock} className="inline-form">
                          <input type="hidden" name="variantId" value={v.id} />
                          <div className="field">
                            <input
                              type="number"
                              name="stock"
                              min={0}
                              defaultValue={v.stock}
                              style={{ width: 100 }}
                            />
                          </div>
                          <button className="btn btn-primary btn-sm">Save</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {variants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        No variants — run the seed migration.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {products.length === 0 && (
        <div className="alert alert-warn">
          No products found. Run the seed migration (0003_seed.sql).
        </div>
      )}
    </div>
  );
}
