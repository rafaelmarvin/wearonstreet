# WEARONSTREET

Streetwear brand store with checkout, customer accounts, an admin dashboard,
and **Midtrans** payments — running **without a VPS** on **Next.js + Supabase + Vercel**.

## Features

- 🛍️ Storefront with per-size stock (S/M/L/XL)
- 👤 Email/password accounts (Supabase Auth); login required to checkout
- 🧺 Cart → checkout → **Midtrans Snap** payment
- 🎟️ Promo codes (server-validated, admin CRUD)
- 🚚 Tiered flat shipping (Rp 10k JABODETABEK+Jawa Barat / Rp 20k elsewhere), upgrade-ready for live courier rates
- 🛠️ Admin: sales overview, order management + manual resi/tracking, stock editor, promo codes
- 🔒 Authoritative server-side pricing, atomic stock reservation, idempotent payment webhook

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Midtrans keys
npm run dev
```

Then follow **[SETUP.md](./SETUP.md)** to create the Supabase project, run the
migrations, configure Midtrans, set an admin user, and deploy to Vercel.

## Tech

Next.js 15 (App Router) · React 19 · Supabase (Postgres + Auth + RLS) · Midtrans Snap.

The original static marketing site is preserved under `legacy/` as a design reference.
