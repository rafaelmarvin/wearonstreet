import Link from "next/link";
import Footer from "@/components/Footer";
import HeroVideo from "@/components/HeroVideo";
import { getProducts } from "@/lib/products";
import { formatRupiah } from "@/lib/format";

export default async function HomePage() {
  const { products } = await getProducts();

  return (
    <>
      {/* Hero */}
      <section className="hero" id="home">
        <div className="hero-content">
          <h1 className="hero-title">
            WEAR
            <br />
            ONSTREET
          </h1>
          <p className="hero-description">
            Hadirkan karakter streetwear yang sesungguhnya ke dalam rotasi outfit
            harianmu. Dengan fokus pada kenyamanan bahan yang maksimal dan desain
            oversized yang estetik, koleksi WearOnStreet diciptakan untuk kamu yang
            berani mengekspresikan diri. Temukan gaya andalanmu sekarang.
          </p>
          <div className="hero-buttons">
            <Link className="btn btn-outline" href="#catalog">
              OUR CATALOG
            </Link>
            <Link className="btn btn-primary" href="#discount">
              GET DISCOUNT
            </Link>
          </div>
        </div>
        <HeroVideo />
      </section>

      {/* Catalog */}
      <section className="catalog" id="catalog">
        <h2 className="section-title">OUR CATALOG</h2>
        <div className="products-grid">
          {products.map((p) => (
            <Link key={p.slug} href={`/product/${p.slug}`} className="product-card">
              <div className="product-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url ?? "/asset/logo.png"} alt={p.name} />
              </div>
              <h3 className="product-name">{p.name}</h3>
              <p className="product-category">{p.category}</p>
              <p className="product-price">{formatRupiah(p.base_price)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Discount */}
      <section className="discount-section" id="discount">
        <div className="discount-content">
          <h2 className="discount-title">SPECIAL DISCOUNT</h2>
          <p className="discount-description">
            Exclusive offer for visitors. Use code <strong>WELCOME10</strong> at
            checkout to get 10% off your first purchase!
          </p>
          <Link className="btn btn-outline-white" href="/cart">
            SHOP NOW
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
