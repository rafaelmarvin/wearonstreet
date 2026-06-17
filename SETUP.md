# WEARONSTREET — Setup Guide

Full e-commerce store: storefront, accounts, checkout with **Midtrans**, and an
admin dashboard — running **without a VPS** on **Supabase + Next.js + Vercel**.

- **Frontend + server logic:** Next.js (App Router) on Vercel
- **Database / Auth / Storage:** Supabase (Postgres + RLS)
- **Payments:** Midtrans Snap (sandbox first, then production)
- **Shipping:** flat tiered (Rp 10k JABODETABEK+Jawa Barat / Rp 20k elsewhere), upgrade-ready
- **Tracking:** admin enters the resi (AWB) manually per order

---

## 0. What you need (accounts)

| Service | Cost | Needed for |
|---|---|---|
| [Supabase](https://supabase.com) | Free tier | Database, login, storage |
| [Vercel](https://vercel.com) | Free (Hobby) | Hosting the site + API + cron |
| [Midtrans](https://midtrans.com) | Free to build (sandbox) | Payments. **Production needs business verification + an Indonesian bank account.** |

---

## 1. Local install

```bash
npm install
cp .env.example .env.local   # then fill in values (steps below)
npm run dev                  # http://localhost:3000
```

The site renders even before Supabase is configured (catalog shows from static
data), but login/checkout/admin need the steps below.

---

## 2. Supabase

1. Create a project at supabase.com. Note the **Project URL** and keys from
   **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`  ← **server only, never expose**
2. Run the migrations **in order** in the Supabase **SQL Editor** (paste each file
   and run), or with the Supabase CLI:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_seed.sql` (4 products + sizes + sample promos)
   - `supabase/migrations/0004_carts.sql` (server-side carts for the admin "Live Carts" view)

   > With the CLI: `supabase link` then `supabase db push`.
3. **Auth settings** (Authentication → Providers → Email): keep "Confirm email" ON.
   Under **Authentication → URL Configuration**, set **Site URL** to your site
   (`http://localhost:3000` for dev, your Vercel URL for prod) and add both to
   **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-DOMAIN/auth/callback`

### Make yourself an admin

Sign up through the app first (so your `auth.users` + `profiles` row exist), then in
the SQL Editor:

```sql
update profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

Now `/admin` is accessible to that account.

---

## 3. Midtrans (sandbox)

1. Create a Midtrans account → switch the dashboard to **Sandbox**.
2. **Settings → Access Keys**: copy
   - `Server Key` → `MIDTRANS_SERVER_KEY` (server only)
   - `Client Key` → `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
   - Keep `NEXT_PUBLIC_MIDTRANS_IS_SANDBOX=true`
3. **Settings → Configuration**:
   - **Payment Notification URL** → `https://YOUR-DOMAIN/api/midtrans/webhook`
     (for local testing, expose your machine with a tunnel like `ngrok http 3000`
     and use that URL, or just rely on the cron sweep + status re-check).
   - **Finish Redirect URL** → `https://YOUR-DOMAIN/account`
4. Test card / e-wallet simulators are in the Midtrans
   [sandbox docs](https://docs.midtrans.com/docs/testing-payment-on-sandbox).

---

## 4. Environment variables

Fill `.env.local` (local) and the **Vercel project env** (production):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MIDTRANS_SERVER_KEY=...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=...
NEXT_PUBLIC_MIDTRANS_IS_SANDBOX=true
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN     # http://localhost:3000 for dev
CRON_SECRET=<long random string>
```

---

## 5. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add all env vars above (set `NEXT_PUBLIC_SITE_URL` to the Vercel URL/domain and
   `NEXT_PUBLIC_MIDTRANS_IS_SANDBOX=true` for now).
3. `vercel.json` already schedules the cron sweep every 10 min. Vercel automatically
   sends `Authorization: Bearer $CRON_SECRET` to the cron route — just make sure
   `CRON_SECRET` is set in the project env.
4. Update the Midtrans Notification URL + Supabase redirect URLs to the live domain.

---

## 6. Going live (production payments)

1. Complete **Midtrans business verification** (KYC + Indonesian settlement bank).
2. Swap to **production** keys and set `NEXT_PUBLIC_MIDTRANS_IS_SANDBOX=false`.
3. Update the production Notification URL in the Midtrans (production) dashboard.
4. Do one small real transaction end-to-end before announcing.

---

## 7. End-to-end test checklist

1. Sign up → confirm email → complete profile (name, phone, province, city, address).
2. Add a size to cart (sold-out sizes are disabled) → `/cart` → `/checkout`.
3. Apply promo `WELCOME10` → see 10% off; confirm **Total = subtotal − discount + shipping**.
4. Pay in the Midtrans sandbox popup → after success, order shows **Paid** in `/account`;
   stock decremented once; promo `used_count` +1.
5. Re-trigger the webhook (or wait for a duplicate) → **no double effect** (idempotent).
6. Let an order expire (don't pay) → within ~30 min + cron, stock is **released once**.
7. In `/admin/orders/[id]`, set status **Shipped** + paste a resi → customer sees it.
8. In `/admin/products`, change stock → reflected on the storefront.
9. Security: a logged-in customer cannot see others' orders and cannot self-promote to admin.

---

## 8. Upgrading shipping to live courier rates (later)

Everything is built behind one function: **`lib/shipping.ts → resolveShippingFee()`**.
To switch from flat rate to live JNE/courier rates (e.g. Komerce/RajaOngkir):

1. Replace the body of `resolveShippingFee()` with an API call to the courier.
2. Swap the province free-text city for a city **dropdown** keyed by the courier's
   destination IDs (replace `lib/regions.ts` with a full provinces+cities dataset),
   and add a per-product **weight** (already on `products.weight_grams`).
3. Nothing else changes — checkout, the order schema, and admin stay the same.

For tracking automation, BinderByte (free trial) offers a cek-resi API you can call
from the admin order page instead of pasting the resi.

---

## 9. Project structure

```
app/
  (shop)/            storefront, cart, checkout, account, login, signup
  admin/             dashboard, orders, products/stock, promos (is_admin gated)
  api/
    checkout/        authoritative total + Snap creation
    midtrans/webhook signature verify + idempotent order transition
    cron/expire-orders  Vercel cron safety net
    promo/preview    read-only promo validation for checkout UI
  auth/              email confirmation + sign-out
components/          Navbar, Cart, AddToCart, Checkout, Admin UI, etc.
lib/                 supabase clients, midtrans, pricing/shipping, types
supabase/migrations/ schema + RLS + functions + seed
legacy/             the original static site (design reference only)
```

## 10. Security model (important)

- The browser is untrusted. **All money, stock, and order status are server-side.**
  Customers can only read products + their own orders and edit their own profile (RLS).
- Order creation, stock decrement, promo consumption run in one Postgres transaction
  (`create_order`) callable only by the service role.
- The Midtrans webhook is signature-verified, amount-checked, status-re-fetched, and
  idempotent. Duplicate/out-of-order notifications can't double-charge or oversell.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, and `CRON_SECRET` server-only
  (never `NEXT_PUBLIC_*`).
