-- ============================================================
-- WEARONSTREET — 0002 commerce functions
-- One transaction = one unit of correctness. These run as SECURITY DEFINER
-- and are callable ONLY by service_role (the server route handlers).
-- ============================================================

-- ------------------------------------------------------------
-- create_order: re-price from DB, reserve stock atomically, validate +
-- consume promo, insert order + items + redemption. Returns the order id.
-- Raises coded exceptions on failure (mapped to user messages by the API).
-- ------------------------------------------------------------
create or replace function create_order(
  p_user_id            uuid,
  p_items              jsonb,   -- [{ "variant_id": uuid, "quantity": int }]
  p_promo_code         text,    -- nullable
  p_shipping_fee       bigint,
  p_midtrans_order_id  text,
  p_ship_full_name     text,
  p_ship_phone         text,
  p_ship_province_code text,
  p_ship_province_name text,
  p_ship_city_name     text,
  p_ship_address_line  text,
  p_expires_at         timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item     record;
  v_price    bigint;
  v_subtotal bigint := 0;
  v_discount bigint := 0;
  v_gross    bigint;
  v_order_id uuid;
  v_promo    promo_codes%rowtype;
  v_user_uses int;
  v_updated  int;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if p_shipping_fee is null or p_shipping_fee < 0 then
    raise exception 'INVALID_SHIPPING';
  end if;

  -- 1) price + reserve stock per line (atomic, no oversell)
  for v_item in
    select (x->>'variant_id')::uuid as variant_id, (x->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) x
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select coalesce(pv.price, p.base_price) into v_price
    from product_variants pv
    join products p on p.id = pv.product_id
    where pv.id = v_item.variant_id and pv.is_active and p.is_active
    for update of pv;

    if not found then
      raise exception 'VARIANT_NOT_FOUND:%', v_item.variant_id;
    end if;

    update product_variants
       set stock = stock - v_item.quantity
     where id = v_item.variant_id and stock >= v_item.quantity;
    if not found then
      raise exception 'OUT_OF_STOCK:%', v_item.variant_id;
    end if;

    v_subtotal := v_subtotal + (v_price * v_item.quantity);
  end loop;

  -- 2) promo (optional): validate + consume atomically
  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from promo_codes
     where upper(code) = upper(trim(p_promo_code))
     for update;

    if not found or not v_promo.is_active then
      raise exception 'PROMO_INVALID';
    end if;
    if v_promo.valid_from > now()
       or (v_promo.valid_until is not null and v_promo.valid_until < now()) then
      raise exception 'PROMO_EXPIRED';
    end if;
    if v_subtotal < v_promo.min_subtotal then
      raise exception 'PROMO_MIN_SUBTOTAL:%', v_promo.min_subtotal;
    end if;
    if v_promo.per_user_limit is not null then
      select count(*) into v_user_uses from promo_code_redemptions
       where promo_code_id = v_promo.id and user_id = p_user_id;
      if v_user_uses >= v_promo.per_user_limit then
        raise exception 'PROMO_PER_USER';
      end if;
    end if;

    if v_promo.type = 'percentage' then
      v_discount := (v_subtotal * v_promo.value) / 100;  -- integer floor
      if v_promo.max_discount is not null and v_discount > v_promo.max_discount then
        v_discount := v_promo.max_discount;
      end if;
    else
      v_discount := v_promo.value;
    end if;
    if v_discount > v_subtotal then v_discount := v_subtotal; end if;

    update promo_codes
       set used_count = used_count + 1
     where id = v_promo.id
       and (total_usage_limit is null or used_count < total_usage_limit);
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'PROMO_EXHAUSTED';
    end if;
  end if;

  v_gross := v_subtotal - v_discount + p_shipping_fee;

  -- 3) order
  insert into orders(
    user_id, midtrans_order_id, status, subtotal, discount_amount, shipping_fee, gross_amount,
    promo_code_id, ship_full_name, ship_phone, ship_province_code, ship_province_name,
    ship_city_name, ship_address_line, expires_at
  ) values (
    p_user_id, p_midtrans_order_id, 'pending_payment', v_subtotal, v_discount, p_shipping_fee, v_gross,
    case when v_promo.id is not null then v_promo.id end,
    p_ship_full_name, p_ship_phone, p_ship_province_code, p_ship_province_name,
    p_ship_city_name, p_ship_address_line, p_expires_at
  ) returning id into v_order_id;

  -- 4) items (snapshot name + price + size)
  insert into order_items(order_id, variant_id, product_id, product_name, size, unit_price, quantity, line_total)
  select v_order_id, pv.id, pv.product_id, p.name, pv.size,
         coalesce(pv.price, p.base_price),
         (x->>'quantity')::int,
         coalesce(pv.price, p.base_price) * (x->>'quantity')::int
  from jsonb_array_elements(p_items) x
  join product_variants pv on pv.id = (x->>'variant_id')::uuid
  join products p on p.id = pv.product_id;

  -- 5) redemption record
  if v_promo.id is not null then
    insert into promo_code_redemptions(promo_code_id, user_id, order_id, discount_amount)
    values (v_promo.id, p_user_id, v_order_id, v_discount);
  end if;

  return v_order_id;
end $$;

-- ------------------------------------------------------------
-- attach_snap: store the Snap token/redirect once obtained from Midtrans.
-- ------------------------------------------------------------
create or replace function attach_snap(
  p_order_id uuid, p_token text, p_redirect_url text
) returns void
language sql security definer set search_path = public as $$
  update orders set snap_token = p_token, snap_redirect_url = p_redirect_url
   where id = p_order_id;
$$;

-- ------------------------------------------------------------
-- mark_order_paid: idempotent forward transition pending_payment -> paid.
-- No stock change (already reserved at creation).
-- ------------------------------------------------------------
create or replace function mark_order_paid(
  p_midtrans_order_id text, p_txn_status text, p_payment_method text
) returns order_status
language plpgsql security definer set search_path = public as $$
declare v_status order_status;
begin
  update orders
     set status = 'paid',
         paid_at = coalesce(paid_at, now()),
         midtrans_txn_status = p_txn_status,
         payment_method = coalesce(p_payment_method, payment_method)
   where midtrans_order_id = p_midtrans_order_id
     and status = 'pending_payment'
  returning status into v_status;

  if v_status is null then
    -- already paid / further along / unknown — idempotent no-op
    select status into v_status from orders where midtrans_order_id = p_midtrans_order_id;
  end if;
  return v_status;
end $$;

-- ------------------------------------------------------------
-- release_order: pending_payment -> expired/cancelled. Restocks + rolls back
-- promo exactly once (guarded by the status transition).
-- ------------------------------------------------------------
create or replace function release_order(
  p_midtrans_order_id text, p_new_status order_status, p_txn_status text
) returns order_status
language plpgsql security definer set search_path = public as $$
declare v_order_id uuid; v_status order_status;
begin
  if p_new_status not in ('expired','cancelled') then
    raise exception 'INVALID_RELEASE_STATUS';
  end if;

  update orders
     set status = p_new_status, midtrans_txn_status = p_txn_status
   where midtrans_order_id = p_midtrans_order_id
     and status = 'pending_payment'
  returning id into v_order_id;

  if v_order_id is null then
    select status into v_status from orders where midtrans_order_id = p_midtrans_order_id;
    return v_status;   -- already handled / paid — never restock
  end if;

  update product_variants pv
     set stock = stock + oi.quantity
    from order_items oi
   where oi.order_id = v_order_id and oi.variant_id = pv.id;

  update promo_codes p
     set used_count = greatest(used_count - 1, 0)
    from promo_code_redemptions r
   where r.order_id = v_order_id and r.promo_code_id = p.id;

  delete from promo_code_redemptions where order_id = v_order_id;

  return p_new_status;
end $$;

-- ------------------------------------------------------------
-- Lock the commerce functions to service_role only (server-side use).
-- is_admin() is intentionally left callable (RLS policies depend on it).
-- ------------------------------------------------------------
revoke all on function create_order(uuid, jsonb, text, bigint, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function attach_snap(uuid, text, text) from public, anon, authenticated;
revoke all on function mark_order_paid(text, text, text) from public, anon, authenticated;
revoke all on function release_order(text, order_status, text) from public, anon, authenticated;

grant execute on function create_order(uuid, jsonb, text, bigint, text, text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function attach_snap(uuid, text, text) to service_role;
grant execute on function mark_order_paid(text, text, text) to service_role;
grant execute on function release_order(text, order_status, text) to service_role;
