"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type NavLink = { href: string; label: string; exact?: boolean; icon: ReactNode };
type NavGroup = { label: string; icon: ReactNode; children: NavLink[] };
type NavItem = NavLink | NavGroup;

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true, icon: <IconDashboard /> },
  {
    label: "Order Management",
    icon: <IconClipboard />,
    children: [
      { href: "/admin/orders", label: "Orders", icon: <IconBag /> },
      { href: "/admin/carts", label: "Live Carts", icon: <IconCart /> },
    ],
  },
  {
    label: "Product Management",
    icon: <IconBox />,
    children: [
      { href: "/admin/products", label: "Products & Stock", icon: <IconLayers /> },
      { href: "/admin/promos", label: "Promo Codes", icon: <IconTag /> },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const isActive = (l: NavLink) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href);

  return (
    <nav className="admin-nav">
      {NAV.map((item) => {
        if (!("children" in item)) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item) ? "active" : ""}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        }

        const childActive = item.children.some(isActive);
        const expanded = open[item.label] ?? childActive;

        return (
          <div key={item.label} className="admin-nav__group">
            <button
              type="button"
              className={`admin-nav__group-header${childActive ? " has-active" : ""}`}
              onClick={() =>
                setOpen((p) => ({ ...p, [item.label]: !expanded }))
              }
              aria-expanded={expanded}
            >
              {item.icon}
              <span>{item.label}</span>
              <IconChevron className={`chevron${expanded ? " open" : ""}`} />
            </button>

            {expanded && (
              <div className="admin-nav__children">
                {item.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={isActive(c) ? "active" : ""}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ---- Inline icons (Feather/Lucide style, inherit text color) ---- */

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12.83 2.18 8.62 3.83a1 1 0 0 1 0 1.82l-8.62 3.83a2 2 0 0 1-1.66 0L2.55 7.83a1 1 0 0 1 0-1.82l8.62-3.83a2 2 0 0 1 1.66 0Z" />
      <path d="m22 12.18-9.17 4.08a2 2 0 0 1-1.66 0L2 12.18" />
      <path d="m22 17.18-9.17 4.08a2 2 0 0 1-1.66 0L2 17.18" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.83 8.83a2 2 0 0 0 2.82 0l7.18-7.18a2 2 0 0 0 0-2.82Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
