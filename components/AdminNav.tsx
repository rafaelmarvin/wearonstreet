"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/carts", label: "Live Carts" },
  { href: "/admin/products", label: "Products & Stock" },
  { href: "/admin/promos", label: "Promo Codes" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {LINKS.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
      <Link href="/">← Back to store</Link>
    </nav>
  );
}
