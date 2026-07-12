-- ============================================================
-- WEARONSTREET — 0005 homepage discount banner
-- Lets an admin pick WHICH promo code is advertised on the home page.
-- At most one row should have show_on_home = true (enforced in the admin action).
-- ============================================================

alter table promo_codes
  add column if not exists show_on_home     boolean not null default false,
  add column if not exists home_title       text,
  add column if not exists home_description text;

create index if not exists idx_promo_home on promo_codes(show_on_home)
  where show_on_home;

-- The home banner is public by design: it advertises the code. Expose ONLY the
-- featured + active row to anon/customers. Every other code stays unreadable by
-- clients (validation still happens server-side in create_order).
drop policy if exists promo_home_read on promo_codes;
create policy promo_home_read on promo_codes for select
  using (show_on_home and is_active);

-- The code the static site used to hard-code. Featured by default so the
-- banner keeps working after this migration.
insert into promo_codes (code, type, value, min_subtotal, show_on_home, home_title)
values ('WEARONWEB', 'percentage', 20, 0, true, 'SPECIAL DISCOUNT')
on conflict (code) do nothing;
