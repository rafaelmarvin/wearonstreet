// Reduce a full referrer URL to a bare hostname (e.g. "instagram.com"). Traffic
// coming from our own site is treated as internal (null => "Direct" in reports),
// so the referrers breakdown only shows genuine external sources.

export function extractReferrerDomain(
  raw: string | null | undefined,
  selfHost: string | null | undefined,
): string | null {
  if (!raw) return null;
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;

  const strip = (h: string) => h.replace(/^www\./, "");
  const clean = strip(host);
  const self = selfHost ? strip(selfHost.toLowerCase().split(":")[0]) : "";

  if (self && clean === self) return null; // internal navigation
  return clean;
}
