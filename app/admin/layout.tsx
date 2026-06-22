import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, profile } = await requireAdmin();

  const name = profile?.full_name?.trim() || "Admin User";
  const initials =
    name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand__mark">W</div>
          <div>
            <div className="admin-brand__name">WEAREON</div>
            <div className="admin-brand__sub">Admin Panel</div>
          </div>
        </div>

        <AdminNav />

        <div className="admin-sidebar__footer">
          <Link href="/" className="admin-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span>Back to Store</span>
          </Link>

          <div className="admin-user">
            <div className="admin-user__avatar">{initials}</div>
            <div className="admin-user__info">
              <div className="admin-user__name">{name}</div>
              <div className="admin-user__email">{email ?? "Administrator"}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
