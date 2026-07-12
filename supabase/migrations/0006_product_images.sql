-- ============================================================
-- WEARONSTREET — 0006 product image storage
-- Bucket for images uploaded from the admin "Add a product" form.
-- Public read (they're shop photos); uploads happen server-side with the
-- service role, so no storage RLS policies are needed for writes.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
