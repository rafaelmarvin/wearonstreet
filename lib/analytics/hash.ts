import { createHash } from "crypto";
import { ANALYTICS_SALT } from "@/lib/env";

// Cookieless, non-reversible visitor id. We hash the IP + User-Agent together
// with a secret salt and the current UTC day. Because the day is part of the
// input, the hash rotates every 24h: the same person is counted once per day
// (like Plausible), but the value can't be linked across days or back to an IP.
export function dailyVisitorHash(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const salt = ANALYTICS_SALT || "wearonstreet-analytics";
  return createHash("sha256")
    .update(`${day}|${salt}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}
