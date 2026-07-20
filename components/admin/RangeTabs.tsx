import Link from "next/link";
import type { RangeKey } from "@/lib/analytics/types";

const TABS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "180d", label: "180 days" },
];

export default function RangeTabs({ active }: { active: RangeKey }) {
  return (
    <div className="analytics-tabs" role="tablist" aria-label="Date range">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/admin/analytics?range=${t.key}`}
          className={`analytics-tab${t.key === active ? " active" : ""}`}
          role="tab"
          aria-selected={t.key === active}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
