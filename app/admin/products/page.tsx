import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { ALL_SIZES } from "@/lib/catalog";
import AdminAlert from "@/components/AdminAlert";
import ConfirmButton from "@/components/ConfirmButton";
import ImageField from "@/components/ImageField";
import {
  createProduct,
  deleteProduct,
  setProductActive,
  updateVariantStock,
} from "@/app/admin/actions";
import type { Product, ProductVariant } from "@/lib/types";

type ProductWithVariants = Product & { variants: ProductVariant[] };

const SIZE_ORDER = { S: 0, M: 1, L: 2, XL: 3 } as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .order("created_at", { ascending: true })
    .returns<ProductWithVariants[]>();

  const products = data ?? [];

  return (
    <div>
      <h1 className="page-title">Products &amp; Stock</h1>
      <p className="page-subtitle">
        Add or remove products, update per-size stock, and hide a product from the
        store without deleting it.
      </p>

      <AdminAlert ok={ok} error={error} />

      {/* ---------- Add a product ---------- */}
      <div className="card">
        <h2>Add a product</h2>
        <form action={createProduct}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required placeholder="BURNING JAW" />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <input id="category" name="category" defaultValue="T-SHIRT" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="base_price">Price (Rp)</label>
              <input
                id="base_price"
                name="base_price"
                type="number"
                min={1}
                required
                placeholder="188000"
              />
            </div>
            <div className="field">
              <label htmlFor="weight_grams">Weight (grams)</label>
              <input
                id="weight_grams"
                name="weight_grams"
                type="number"
                min={1}
                defaultValue={250}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="slug">URL slug</label>
            <input id="slug" name="slug" placeholder="burning-jaw" />
            <span className="field-hint">
              Leave blank to generate it from the name. Used in the product URL.
            </span>
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Shown on the product page."
            />
          </div>

          <div className="field-row">
            <ImageField
              name="image_file"
              label="Product photo"
              required
              hint="The photo of the shirt itself — shown on the catalog card and at the top of the product page."
            />
            <ImageField
              name="detail_image_file"
              label="Character artwork"
              hint="Shown next to the character background story on the product page."
            />
          </div>

          <div className="field">
            <label>Starting stock</label>
            <div className="stock-grid">
              {ALL_SIZES.map((size) => (
                <div className="field" key={size}>
                  <label htmlFor={`stock_${size}`}>{size}</label>
                  <input
                    id={`stock_${size}`}
                    name={`stock_${size}`}
                    type="number"
                    min={0}
                    defaultValue={0}
                  />
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary">ADD PRODUCT</button>
        </form>
      </div>

      {/* ---------- Existing products ---------- */}
      {products.map((p) => {
        const variants = [...(p.variants ?? [])].sort(
          (a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size],
        );
        return (
          <div className="card" key={p.id}>
            <div className="flex-between">
              <div className="inline-form" style={{ alignItems: "center" }}>
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="product-thumb" src={p.image_url} alt={p.name} />
                )}
                <h2 style={{ margin: 0 }}>
                  {p.name}{" "}
                  <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                    · {formatRupiah(p.base_price)}
                  </span>
                </h2>
              </div>

              <div className="inline-form">
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

                <form action={deleteProduct}>
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="name" value={p.name} />
                  <ConfirmButton
                    message={`Delete ${p.name} and all of its sizes? This cannot be undone.`}
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
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
          No products yet. Add one above, or run the seed migration (0003_seed.sql).
        </div>
      )}
    </div>
  );
}
