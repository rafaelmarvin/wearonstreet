// Local diagnostic: does the service-role key work, and what promo rows exist?
// Run: node scripts/diag-promos.mjs   (reads .env.local; prints NO secrets)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL:", url);
console.log("service key prefix:", (key || "").slice(0, 8), "len:", (key || "").length);

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await sb
  .from("promo_codes")
  .select("code, type, value, is_active, min_subtotal, used_count, total_usage_limit, per_user_limit, valid_from, valid_until");

if (error) {
  console.log("\n❌ READ ERROR (service key likely invalid / RLS not bypassed):");
  console.log("   message:", error.message);
  console.log("   code:", error.code, "details:", error.details);
} else {
  console.log(`\n✓ service key works. ${data.length} promo row(s):`);
  for (const p of data) {
    console.log(
      `   [${JSON.stringify(p.code)}] active=${p.is_active} ${p.type} ${p.value} ` +
        `min=${p.min_subtotal} used=${p.used_count}/${p.total_usage_limit ?? "∞"} ` +
        `perUser=${p.per_user_limit ?? "∞"} from=${p.valid_from} until=${p.valid_until ?? "—"}`,
    );
  }
}
