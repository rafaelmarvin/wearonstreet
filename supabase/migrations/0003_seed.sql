-- ============================================================
-- WEARONSTREET — 0003 seed (4 launch products + S/M/L/XL variants)
-- Idempotent: safe to re-run. Adjust stock/prices later in the admin panel.
-- ============================================================

insert into products (slug, name, category, description, base_price, image_url, detail_image_url, weight_grams)
values
  ('shape-me',     'SHAPE ME',     'T-SHIRT',
   'Shape Me mengangkat konsep ekspresi bebas dengan gaya coretan yang raw dan spontan.',
   188000, '/asset/shapeme.jpg',  '/asset/shapeme.png',     250),
  ('burning-jaw',  'BURNING JAW',  'T-SHIRT',
   'Burning Jaw hadir dengan rahang berapi sebagai simbol energi dan keberanian.',
   188000, '/asset/fire.jpg',     '/asset/burningjaw.png',  250),
  ('skully-brain', 'SKULLY BRAIN', 'T-SHIRT',
   'Skully Brain menggabungkan elemen tengkorak dan otak dengan gaya playful.',
   188000, '/asset/bone.jpg',     '/asset/skullybrain.png', 250),
  ('melting-candy','MELTING CANDY','T-SHIRT',
   'Melting Candy menghadirkan konsep lucu dengan elemen lelehan permen yang playful.',
   188000, '/asset/melting.jpg',  '/asset/meltingcandy.png',250)
on conflict (slug) do nothing;

-- One variant per size for every product, with starter stock.
insert into product_variants (product_id, size, stock)
select p.id, s.size, 25
from products p
cross join (values ('S'::product_size), ('M'), ('L'), ('XL')) as s(size)
on conflict (product_id, size) do nothing;

-- Sample promo codes for testing (disable or delete in production).
insert into promo_codes (code, type, value, min_subtotal, max_discount, total_usage_limit, per_user_limit)
values
  ('WELCOME10', 'percentage', 10, 0,      50000, null, 1),   -- 10% off, max Rp 50k, 1x per user
  ('POTONG20K', 'fixed',      20000, 150000, null, 100,  null) -- Rp 20.000 off min belanja Rp 150k
on conflict (code) do nothing;
