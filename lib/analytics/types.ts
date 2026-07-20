// Shapes returned by the analytics_report() Postgres function (0007_analytics.sql).

export interface AnalyticsTotals {
  views: number;
  visitors: number;
}

export interface TimeseriesPoint {
  bucket: string; // "YYYY-MM-DDTHH:MM" in WIB (Asia/Jakarta) local time
  views: number;
  visitors: number;
}

export interface BreakdownRow {
  key: string;
  views: number;
  visitors?: number;
}

export interface AnalyticsReport {
  totals: AnalyticsTotals;
  timeseries: TimeseriesPoint[];
  paths: BreakdownRow[];
  referrers: BreakdownRow[];
  countries: BreakdownRow[];
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  os: BreakdownRow[];
}

export type RangeKey = "24h" | "7d" | "30d" | "90d" | "180d";

export const EMPTY_REPORT: AnalyticsReport = {
  totals: { views: 0, visitors: 0 },
  timeseries: [],
  paths: [],
  referrers: [],
  countries: [],
  devices: [],
  browsers: [],
  os: [],
};
