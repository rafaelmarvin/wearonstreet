// Tiny, dependency-free User-Agent parser. Deliberately coarse — we only need
// the buckets an analytics dashboard shows (browser / OS / device family), not
// exact versions. Keeping it in-repo avoids pulling in ua-parser-js just for this.

export interface UAInfo {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
}

/** Well-known crawlers / previewers / HTTP libraries we never count as visits. */
export const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternal|embedly|quora|pinterest|vkshare|whatsapp|telegram|flipboard|tumblr|redditbot|discordbot|headless|lighthouse|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http|okhttp|java\/|libwww|apache-httpclient/i;

export function isBot(ua: string): boolean {
  return !ua || BOT_RE.test(ua);
}

export function parseUserAgent(ua: string, screenWidth?: number): UAInfo {
  const s = ua.toLowerCase();

  // ---- OS ----
  let os = "Unknown";
  if (/windows nt|windows phone|windows/.test(s)) os = "Windows";
  else if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (/android/.test(s)) os = "Android";
  else if (/cros/.test(s)) os = "ChromeOS";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/linux/.test(s)) os = "Linux";

  // ---- Browser (order matters: check the specific tokens first) ----
  let browser = "Unknown";
  if (/edg\/|edga\/|edgios\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/samsungbrowser/.test(s)) browser = "Samsung Internet";
  else if (/ucbrowser/.test(s)) browser = "UC Browser";
  else if (/firefox|fxios/.test(s)) browser = "Firefox";
  else if (/chrome|crios|crmo/.test(s)) browser = "Chrome";
  else if (/safari/.test(s)) browser = "Safari";

  // ---- Device family ----
  let device: UAInfo["device"] = "desktop";
  if (/ipad|(android(?!.*mobile))|tablet|kindle|silk|playbook/.test(s)) {
    device = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/.test(s)) {
    device = "mobile";
  } else if (typeof screenWidth === "number" && screenWidth > 0) {
    // Fall back to the viewport width the client reported.
    if (screenWidth < 768) device = "mobile";
    else if (screenWidth < 1024) device = "tablet";
  }

  return { browser, os, device };
}
