// Canonical static brand content for the 4 launch products.
// This is marketing copy + image mapping (not commerce data). Prices and stock
// are the database's source of truth; this only drives lore on product pages
// and is reused to generate the DB seed (see supabase/migrations/0003_seed.sql).

import type { Size } from "./types";

export const ALL_SIZES: Size[] = ["S", "M", "L", "XL"];

export interface CatalogEntry {
  slug: string;
  name: string;
  category: string;
  basePrice: number; // integer rupiah
  weightGrams: number;
  cardImage: string; // /asset/...  (catalog thumbnail)
  detailImage: string; // /asset/... (product detail)
  about: string;
  background: string; // multi-line lore (\n separated)
  quote: string;
}

export const CATALOG: CatalogEntry[] = [
  {
    slug: "shape-me",
    name: "SHAPE ME",
    category: "T-SHIRT",
    basePrice: 188000,
    weightGrams: 250,
    cardImage: "/asset/shapeme.jpg",
    detailImage: "/asset/shapeme.png",
    about:
      "Shape Me mengangkat konsep ekspresi bebas dengan gaya coretan yang raw dan spontan. Terlihat simple, tapi penuh karakter—cocok untuk kamu yang berani tampil apa adanya tanpa banyak aturan.",
    background:
      "Di sebuah kelas, ada anak kecil yang terus dibully.\n" +
      "Tidak pernah melawan. Tidak pernah didengar.\n" +
      "Sampai suatu hari... dia menggambar sesuatu di papan tulis.\n" +
      "Sosok itu sederhana—hanya garis. Tapi penuh emosi: takut, marah, dan keinginan untuk melawan.\n" +
      "Dan entah bagaimana, gambar itu keluar dari papan. Mr. Shape lahir.\n" +
      "Dia tidak sempurna. Tidak rapi. Tapi dia nyata.\n" +
      "Dia mulai muncul di sudut kelas, di dinding, di bayangan... menakuti anak-anak yang pernah menyakiti penciptanya.\n" +
      "Bukan untuk membunuh—tapi untuk membuat mereka merasakan rasa takut yang sama.",
    quote: "Drawn from fear... born to protect.",
  },
  {
    slug: "burning-jaw",
    name: "BURNING JAW",
    category: "T-SHIRT",
    basePrice: 188000,
    weightGrams: 250,
    cardImage: "/asset/fire.jpg",
    detailImage: "/asset/burningjaw.png",
    about:
      'Burning Jaw adalah artikel perdana "WearOnStreet" dengan karakter kuat dan berani. Mr. Wearon, a.k.a Burning Jaw, hadir dengan rahang berapi sebagai simbol energi dan keberanian, membawa nuansa api yang agresif dan penuh statement dalam street style.',
    background:
      "Terlahir langsung dari perut gunung berapi, Mr. Burn bukan sekadar makhluk—dia adalah ledakan yang hidup.\n" +
      "Dia punya sifat kritis, tajam, dan penuh tekanan.\n" +
      "Seperti magma yang terus menumpuk di dalam bumi, emosinya tidak pernah benar-benar tenang.\n" +
      "Setiap langkahnya membawa panas. Setiap pikirannya seperti tekanan yang siap meledak.\n" +
      'Dia tidak mudah percaya, tidak mudah diam—karena dia tahu, dunia tidak akan berubah tanpa "ledakan".',
    quote: "Pressure creates power.",
  },
  {
    slug: "skully-brain",
    name: "SKULLY BRAIN",
    category: "T-SHIRT",
    basePrice: 188000,
    weightGrams: 250,
    cardImage: "/asset/bone.jpg",
    detailImage: "/asset/skullybrain.png",
    about:
      "Skully Brain menggabungkan elemen tengkorak dan otak dengan gaya unik yang playful. Terlihat nyentrik dan beda, desain ini cocok untuk kamu yang suka tampil out of the box dengan karakter kuat.",
    background:
      "Di universe lain, bukan Street-101... ada versi lain dari Mr. WearOn.\n" +
      "Dia mati di hutan. Sendirian. Tanpa siapa pun. Seharusnya... itu akhir.\n" +
      "Tapi rohnya kembali. Masalahnya—tubuhnya sudah tidak sama lagi.\n" +
      "Dagingnya hilang. Yang tersisa hanya tulang yang bermutasi... bergerak tanpa alasan yang jelas.\n" +
      "Sekarang dia adalah Mr. Skully. Dia berjalan tanpa tujuan, tanpa jawaban.\n" +
      "Yang dia tahu cuma satu: dia tidak seharusnya ada.",
    quote: "Why was I brought back?",
  },
  {
    slug: "melting-candy",
    name: "MELTING CANDY",
    category: "T-SHIRT",
    basePrice: 188000,
    weightGrams: 250,
    cardImage: "/asset/melting.jpg",
    detailImage: "/asset/meltingcandy.png",
    about:
      "Melting Candy menghadirkan konsep lucu dengan elemen lelehan seperti permen yang playful. Desain ini memberi kesan fun, ringan, dan ekspresif—cocok untuk gaya santai yang tetap standout.",
    background:
      "Awalnya... dia cuma permen biasa. Tidak spesial. Tidak hidup.\n" +
      "Hanya sesuatu yang manis dan akan habis dimakan.\n" +
      "Tapi semuanya berubah saat dia tercampur sebuah ramuan aneh.\n" +
      "Tubuhnya mulai mencair... bergerak... dan akhirnya hidup.\n" +
      "Mr. Melt sekarang adalah makhluk slime yang terus berubah bentuk.\n" +
      'Dia adalah hasil "kecelakaan"... yang sekarang harus hidup dengan konsekuensinya.',
    quote: "I was never meant to live... but here I am.",
  },
];

export function getCatalogEntry(slug: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.slug === slug);
}
