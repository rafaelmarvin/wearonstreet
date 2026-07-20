import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isBot, parseUserAgent } from "@/lib/analytics/ua";
import { extractReferrerDomain } from "@/lib/analytics/referrer";
import { dailyVisitorHash } from "@/lib/analytics/hash";

export const runtime = "nodejs";

interface Beacon {
  path?: string;
  referrer?: string | null;
  screen?: number;
}

// Always answer 204 (no body). This endpoint is fire-and-forget from a
// navigator.sendBeacon call — the browser ignores the response, and we never
// want a tracking failure to surface to a shopper.
const noContent = () => new Response(null, { status: 204 });

/** Keep only a clean same-origin pathname; drop query, hash, and junk. */
function normalizePath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let path = input.trim();
  if (!path.startsWith("/")) return null;
  path = path.split(/[?#]/)[0];
  if (path.length > 1) path = path.replace(/\/+$/, ""); // strip trailing slash (keep "/")
  if (path.length === 0) path = "/";
  if (path.length > 512) return null;
  return path;
}

export async function POST(request: Request) {
  // No service role (e.g. local dev without keys) => silently no-op.
  if (!isServiceRoleConfigured()) return noContent();

  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return noContent();

  let body: Beacon;
  try {
    body = (await request.json()) as Beacon;
  } catch {
    return noContent();
  }

  const path = normalizePath(body.path);
  // Never record the admin panel itself.
  if (!path || path.startsWith("/admin")) return noContent();

  const h = request.headers;
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    (h.get("x-real-ip") ?? "");
  // Country is provided by the hosting edge (Vercel) — not a third-party call.
  const country = h.get("x-vercel-ip-country")?.toUpperCase() || null;
  const selfHost = h.get("host");

  const { browser, os, device } = parseUserAgent(
    ua,
    typeof body.screen === "number" ? body.screen : undefined,
  );
  const referrerDomain = extractReferrerDomain(body.referrer, selfHost);
  const visitorHash = dailyVisitorHash(ip, ua);

  try {
    const admin = createAdminClient();
    await admin.from("analytics_events").insert({
      path,
      referrer_domain: referrerDomain,
      visitor_hash: visitorHash,
      country,
      device,
      browser,
      os,
    });
  } catch (err) {
    console.error(
      "[analytics/collect]",
      err instanceof Error ? err.message : err,
    );
  }

  return noContent();
}
