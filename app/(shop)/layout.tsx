import Navbar from "@/components/Navbar";
import { getAuthState } from "@/lib/auth";

// Render per-request: pages depend on the logged-in user (navbar state, account,
// checkout) and on live product stock. Avoids baking logged-out HTML at build.
export const dynamic = "force-dynamic";

const BANNER =
  "DISCOVER BOLD AND AUTHENTIC STREETWEAR FROM OUR NEWLY LAUNCHED BRAND - VISIT OUR WEBSITE NOW TO GET AN EXCLUSIVE DISCOUNT ON YOUR FIRST PURCHASE.";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, profile } = await getAuthState();

  return (
    <>
      <div className="announcement-banner">
        <p>{BANNER}</p>
      </div>
      <Navbar isLoggedIn={!!userId} isAdmin={!!profile?.is_admin} />
      <main>{children}</main>
    </>
  );
}
