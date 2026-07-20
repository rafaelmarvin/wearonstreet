import { createClient } from "@/lib/supabase/server";
import AnalyticsChart from "@/components/admin/AnalyticsChart";
import BreakdownList, { flagEmoji } from "@/components/admin/BreakdownList";
import RangeTabs from "@/components/admin/RangeTabs";
import {
  EMPTY_REPORT,
  type AnalyticsReport,
  type RangeKey,
} from "@/lib/analytics/types";

// Always render fresh — analytics is inherently live data.
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const RANGE_CONFIG: Record<RangeKey, { ms: number; bucket: "hour" | "day" }> = {
  "24h": { ms: DAY, bucket: "hour" },
  "7d": { ms: 7 * DAY, bucket: "day" },
  "30d": { ms: 30 * DAY, bucket: "day" },
  "90d": { ms: 90 * DAY, bucket: "day" },
  "180d": { ms: 180 * DAY, bucket: "day" },
};

function resolveRange(raw: string | undefined): RangeKey {
  return raw === "24h" ||
    raw === "7d" ||
    raw === "30d" ||
    raw === "90d" ||
    raw === "180d"
    ? raw
    : "7d";
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = resolveRange(rawRange);
  const cfg = RANGE_CONFIG[range];

  const to = new Date();
  const from = new Date(to.getTime() - cfg.ms);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("analytics_report", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_bucket: cfg.bucket,
    p_tz: "Asia/Jakarta",
  });

  if (error) {
    console.error("[admin/analytics] rpc error:", error.message);
  }
  const report: AnalyticsReport =
    !error && data ? (data as AnalyticsReport) : EMPTY_REPORT;

  const { views, visitors } = report.totals;
  const perVisitor = visitors > 0 ? (views / visitors).toFixed(1) : "—";

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Cookieless, self-hosted traffic — stored in your own Supabase.
          </p>
        </div>
        <RangeTabs active={range} />
      </div>

      <div className="stat-grid" style={{ marginTop: 28 }}>
        <div className="stat-card">
          <div className="label">Pageviews</div>
          <div className="value">{views.toLocaleString("id-ID")}</div>
        </div>
        <div className="stat-card">
          <div className="label">Unique visitors</div>
          <div className="value">{visitors.toLocaleString("id-ID")}</div>
        </div>
        <div className="stat-card">
          <div className="label">Views / visitor</div>
          <div className="value">{perVisitor}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Traffic over time</h2>
        <AnalyticsChart data={report.timeseries} bucket={cfg.bucket} />
      </div>

      <div className="analytics-grid">
        <BreakdownList
          title="Countries"
          keyHeader="Country"
          items={report.countries}
          renderKey={(k) =>
            k === "Unknown" ? (
              <>🌐 Unknown</>
            ) : (
              <>
                {flagEmoji(k)} {k}
              </>
            )
          }
        />
        <BreakdownList
          title="Devices"
          keyHeader="Device"
          items={report.devices}
          renderKey={cap}
        />
        <BreakdownList
          title="Browsers"
          keyHeader="Browser"
          items={report.browsers}
        />
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
        No cookies and no third-party trackers. Visitors are counted once per day
        via a non-reversible hash. Admin pages are excluded. Times shown in WIB.
      </p>
    </div>
  );
}
