import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import AddToCart from "@/components/AddToCart";
import { getProductBySlug } from "@/lib/products";
import { getCatalogEntry } from "@/lib/catalog";
import { formatRupiah } from "@/lib/format";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const lore = getCatalogEntry(slug);

  return (
    <>
      <div className="page">
        <div className="crumb">
          <Link href="/#catalog">CATALOG</Link> / {product.name}
        </div>

        <div className="pdp">
          {/* The product shot (same image as the catalog card) — NOT the character
              artwork, which lives with the lore below. */}
          <div className="pdp-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url ?? product.detail_image_url ?? "/asset/logo.png"}
              alt={product.name}
            />
          </div>

          <div className="pdp-info">
            <p className="product-category">{product.category}</p>
            <h1 className="pdp-title">{product.name}</h1>
            <p className="pdp-price">{formatRupiah(product.base_price)}</p>
            {product.description && (
              <p className="pdp-desc">{product.description}</p>
            )}

            <AddToCart product={product} />

            {lore && (
              <div className="character-background">
                <h3>Character Background</h3>
                {product.detail_image_url && (
                  <div className="character-art">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.detail_image_url}
                      alt={`${product.name} character artwork`}
                    />
                  </div>
                )}
                {lore.background.split("\n").map((line, i) => (
                  <p key={i} style={{ marginBottom: 8 }}>
                    {line}
                  </p>
                ))}
                <p style={{ fontStyle: "italic", marginTop: 12 }}>
                  &ldquo;{lore.quote}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
