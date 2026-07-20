-- ============================================================
-- WEARONSTREET — 0007 self-hosted web analytics (Vercel-Analytics-style)
-- Privacy-friendly and cookieless. Raw pageview events are written ONLY by the
-- server (service role) via /api/analytics/collect; admins read AGGREGATES
-- through analytics_report(). No third-party analytics service is involved —
-- all data lives in this Supabase project.
-- ============================================================

create table if not exists analytics_events (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  event_type      text not null default 'pageview',
  path            text not null,
  referrer_domain text,                -- null => direct / internal
  -- Daily-rotating sha256(day + salt + ip + user-agent). NOT reversible and
  -- rotates every UTC day, so a visitor can be counted once per day without
  -- storing any personal identifier or setting a cookie.
  visitor_hash    text not null,
  country         text,                -- ISO-2 from the hosting edge (x-vercel-ip-country)
  device          text,                -- desktop | mobile | tablet
  browser         text,
  os              text
);

create index if not exists idx_analytics_created  on analytics_events (created_at desc);
create index if not exists idx_analytics_path      on analytics_events (path);
create index if not exists idx_analytics_visitor   on analytics_events (visitor_hash);

alter table analytics_events enable row level security;

-- Admins may read raw events; there are NO client write policies, so inserts
-- only succeed through the service role (like cart_items in 0004).
drop policy if exists analytics_admin_select on analytics_events;
create policy analytics_admin_select on analytics_events for select
  using (is_admin());

-- ------------------------------------------------------------
-- analytics_report(): single aggregation entrypoint.
-- Returns totals + a gap-filled timeseries + the top breakdowns as one JSON
-- payload, so the admin page makes one round trip and raw rows never leave
-- Postgres. security definer (bypasses RLS) but guarded by is_admin().
-- ------------------------------------------------------------
create or replace function analytics_report(
  p_from   timestamptz,
  p_to     timestamptz,
  p_bucket text default 'day',          -- 'hour' | 'day'
  p_tz     text default 'Asia/Jakarta'  -- WIB, so days align to the store's day
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result   jsonb;
  v_bucket text     := case when p_bucket = 'hour' then 'hour' else 'day' end;
  v_step   interval := case when p_bucket = 'hour' then interval '1 hour'
                                                    else interval '1 day' end;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  with ev as (
    select *
    from analytics_events
    where created_at >= p_from and created_at < p_to
  ),
  totals as (
    select count(*)::bigint                        as views,
           count(distinct visitor_hash)::bigint    as visitors
    from ev
  ),
  -- Every bucket in range, so the chart shows zero-days instead of gaps.
  buckets as (
    select generate_series(
      date_trunc(v_bucket, (p_from at time zone p_tz)),
      date_trunc(v_bucket, (p_to   at time zone p_tz)),
      v_step
    ) as b
  ),
  raw_series as (
    select date_trunc(v_bucket, (created_at at time zone p_tz)) as b,
           count(*)::bigint                     as views,
           count(distinct visitor_hash)::bigint as visitors
    from ev
    group by 1
  ),
  series as (
    select to_char(bk.b, 'YYYY-MM-DD"T"HH24:MI') as bucket,
           coalesce(rs.views, 0)::bigint         as views,
           coalesce(rs.visitors, 0)::bigint      as visitors
    from buckets bk
    left join raw_series rs on rs.b = bk.b
    order by bk.b
  ),
  top_paths as (
    select path as key,
           count(*)::bigint                     as views,
           count(distinct visitor_hash)::bigint as visitors
    from ev group by path order by views desc, key limit 12
  ),
  top_ref as (
    select coalesce(referrer_domain, 'Direct') as key, count(*)::bigint as views
    from ev group by 1 order by views desc, key limit 8
  ),
  top_country as (
    select coalesce(country, 'Unknown') as key, count(*)::bigint as views
    from ev group by 1 order by views desc, key limit 8
  ),
  top_device as (
    select coalesce(device, 'Unknown') as key, count(*)::bigint as views
    from ev group by 1 order by views desc, key limit 8
  ),
  top_browser as (
    select coalesce(browser, 'Unknown') as key, count(*)::bigint as views
    from ev group by 1 order by views desc, key limit 8
  ),
  top_os as (
    select coalesce(os, 'Unknown') as key, count(*)::bigint as views
    from ev group by 1 order by views desc, key limit 8
  )
  select jsonb_build_object(
    'totals',     (select to_jsonb(t) from totals t),
    'timeseries', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from series s),
    'paths',      (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from top_paths p),
    'referrers',  (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from top_ref r),
    'countries',  (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from top_country c),
    'devices',    (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from top_device d),
    'browsers',   (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from top_browser b),
    'os',         (select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) from top_os o)
  ) into result;

  return result;
end $$;

-- Only signed-in admins (guarded by is_admin() above) may aggregate.
revoke all on function analytics_report(timestamptz, timestamptz, text, text) from public;
grant execute on function analytics_report(timestamptz, timestamptz, text, text) to authenticated;
