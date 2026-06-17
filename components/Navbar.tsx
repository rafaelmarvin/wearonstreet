"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

interface NavbarProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

const CHARACTERS = [
  { slug: "shape-me", name: "SHAPE ME" },
  { slug: "burning-jaw", name: "BURNING JAW" },
  { slug: "skully-brain", name: "SKULLY BRAIN" },
  { slug: "melting-candy", name: "MELTING CANDY" },
];

export default function Navbar({ isLoggedIn, isAdmin }: NavbarProps) {
  const { count, hydrated } = useCart();

  return (
    <header className="navbar">
      <nav className="nav-container">
        <ul className="nav-links">
          <li>
            <Link href="/">HOME</Link>
          </li>
          <li className="dropdown">
            <span className="dropdown-toggle">
              CHARACTERS <span className="dropdown-arrow">▼</span>
            </span>
            <ul className="dropdown-menu">
              {CHARACTERS.map((c) => (
                <li key={c.slug}>
                  <Link href={`/product/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <Link href="/#catalog">CATALOG</Link>
          </li>
          <li>
            <Link href="/#contact">CONTACT</Link>
          </li>
          {isAdmin && (
            <li>
              <Link href="/admin">ADMIN</Link>
            </li>
          )}
        </ul>

        <Link href="/" className="logo">
          <img width={40} height={40} src="/asset/logo.png" alt="WEARONSTREET Logo" />
          <span>WEARONSTREET</span>
        </Link>

        <div className="nav-right">
          <Link href={isLoggedIn ? "/account" : "/login"} className="nav-account">
            {isLoggedIn ? "ACCOUNT" : "LOGIN"}
          </Link>
          <Link href="/cart" className="cart-icon" aria-label="Cart">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {hydrated && count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
        </div>
      </nav>
    </header>
  );
}
