-- ============================================================
-- WEARONSTREET — 0004 server-side carts (admin pre-checkout cart tracking)
-- Mirrors each logged-in customer's cart so admins can see live carts.
-- Writes are service-role only (via /api/cart/sync); customers read own, admins read all.
-- ============================================================

create table if not exists cart_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);
create index if not exists idx_cart_items_user on cart_items(user_id);
create index if not exists idx_cart_items_updated on cart_items(updated_at desc);

alter table cart_items enable row level security;

-- Customers may read their own cart; admins read all. No client writes (service role only).
drop policy if exists cart_select on cart_items;
create policy cart_select on cart_items for select
  using (user_id = auth.uid() or is_admin());
