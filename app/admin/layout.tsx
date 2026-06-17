import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">WEARONSTREET · ADMIN</div>
        <AdminNav />
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
