-- ============================================================
-- WEARONSTREET — 0001 schema, constraints, RLS
-- All money is integer rupiah (bigint). IDR has no cents.
-- ============================================================

-- ---------- enums ----------
do $$ begin
  create type product_size as enum ('S','M','L','XL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending_payment','paid','processing','shipped','delivered',
    'cancelled','expired','refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_type as enum ('percentage','fixed');
exception when duplicate_object then null; end $$;

-- ---------- updated_at helper ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- profiles (1:1 with auth.users)
-- ============================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  phone         text not null,
  province_code text not null,
  province_name text not null,
  city_name     text not null,
  address_line  text not null,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- admin check helper — defined AFTER profiles so the SQL function body validates.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Prevent privilege escalation: a non-admin can never set is_admin on insert/update.
create or replace function guard_is_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Trusted contexts (service role, SQL editor, superuser) have no end-user JWT,
  -- so auth.uid() is null. Only logged-in end-users are blocked from escalating.
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.is_admin and not is_admin() then
      new.is_admin := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if (new.is_admin is distinct from old.is_admin) and not is_admin() then
      raise exception 'not allowed to change is_admin';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_is_admin on profiles;
create trigger trg_guard_is_admin before insert or update on profiles
  for each row execute function guard_is_admin();

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- products + variants
-- ============================================================
create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  category         text not null default 'T-SHIRT',
  description      text,
  base_price       bigint not null check (base_price >= 0),
  image_url        text,
  detail_image_url text,
  weight_grams     integer not null default 250 check (weight_grams > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size       product_size not null,
  price      bigint check (price >= 0),       -- null => inherit products.base_price
  stock      integer not null default 0 check (stock >= 0),
  is_active  boolean not null default true,
  unique (product_id, size)
);
create index if not exists idx_variants_product on product_variants(product_id);

-- ============================================================
-- promo codes
-- ============================================================
create table if not exists promo_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  type              promo_type not null,
  value             bigint not null check (value > 0),  -- percent(1..100) OR rupiah
  min_subtotal      bigint not null default 0 check (min_subtotal >= 0),
  max_discount      bigint check (max_discount >= 0),   -- optional cap for % promos
  total_usage_limit integer check (total_usage_limit >= 0),
  per_user_limit    integer check (per_user_limit >= 0),
  used_count        integer not null default 0 check (used_count >= 0),
  valid_from        timestamptz not null default now(),
  valid_until       timestamptz,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  check (type <> 'percentage' or value between 1 and 100)
);

-- ============================================================
-- orders + items
-- ============================================================
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id),
  midtrans_order_id  text unique not null,
  status             order_status not null default 'pending_payment',

  subtotal           bigint not null check (subtotal >= 0),
  discount_amount    bigint not null default 0 check (discount_amount >= 0),
  shipping_fee       bigint not null check (shipping_fee >= 0),
  gross_amount       bigint not null check (gross_amount >= 0),

  promo_code_id      uuid references promo_codes(id),

  ship_full_name     text not null,
  ship_phone         text not null,
  ship_province_code text not null,
  ship_province_name text not null,
  ship_city_name     text not null,
  ship_address_line  text not null,

  payment_method      text,
  midtrans_txn_status text,
  snap_token          text,
  snap_redirect_url   text,
  tracking_number     text,
  paid_at             timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint gross_amount_consistent
    check (gross_amount = subtotal - discount_amount + shipping_fee),
  constraint discount_not_exceed_subtotal
    check (discount_amount <= subtotal)
);
create index if not exists idx_orders_user on orders(user_id, created_at desc);
create index if not exists idx_orders_status on orders(status);

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  variant_id   uuid not null references product_variants(id),
  product_id   uuid not null references products(id),
  product_name text not null,
  size         product_size not null,
  unit_price   bigint not null check (unit_price >= 0),
  quantity     integer not null check (quantity > 0),
  line_total   bigint not null check (line_total = unit_price * quantity)
);
create index if not exists idx_order_items_order on order_items(order_id);

create table if not exists promo_code_redemptions (
  id              uuid primary key default gen_random_uuid(),
  promo_code_id   uuid not null references promo_codes(id),
  user_id         uuid not null references auth.users(id),
  order_id        uuid not null references orders(id) on delete cascade,
  discount_amount bigint not null,
  created_at      timestamptz not null default now(),
  unique (order_id)
);
create index if not exists idx_redemptions_promo_user on promo_code_redemptions(promo_code_id, user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles               enable row level security;
alter table products               enable row level security;
alter table product_variants       enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table promo_codes            enable row level security;
alter table promo_code_redemptions enable row level security;

-- profiles: own row; admins all
drop policy if exists prof_select on profiles;
create policy prof_select on profiles for select
  using (id = auth.uid() or is_admin());
drop policy if exists prof_insert on profiles;
create policy prof_insert on profiles for insert
  with check (id = auth.uid());
drop policy if exists prof_update on profiles;
create policy prof_update on profiles for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- products / variants: public read of active rows; admins manage
drop policy if exists prod_read on products;
create policy prod_read on products for select
  using (is_active or is_admin());
drop policy if exists prod_admin on products;
create policy prod_admin on products for all
  using (is_admin()) with check (is_admin());

drop policy if exists var_read on product_variants;
create policy var_read on product_variants for select
  using (is_active or is_admin());
drop policy if exists var_admin on product_variants;
create policy var_admin on product_variants for all
  using (is_admin()) with check (is_admin());

-- orders: customer reads own; admin reads all + updates (status/tracking).
-- NO client insert — all creation is server-side via service role.
drop policy if exists ord_select on orders;
create policy ord_select on orders for select
  using (user_id = auth.uid() or is_admin());
drop policy if exists ord_admin_update on orders;
create policy ord_admin_update on orders for update
  using (is_admin()) with check (is_admin());

-- order_items: read if you own the parent order (or admin). No client writes.
drop policy if exists oi_select on order_items;
create policy oi_select on order_items for select
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or is_admin())
  ));

-- promo_codes: no anon/customer select (validated server-side); admin manages.
drop policy if exists promo_admin on promo_codes;
create policy promo_admin on promo_codes for all
  using (is_admin()) with check (is_admin());

-- redemptions: customer reads own; admin all. No client writes.
drop policy if exists redeem_select on promo_code_redemptions;
create policy redeem_select on promo_code_redemptions for select
  using (user_id = auth.uid() or is_admin());
