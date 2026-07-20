import type { ReactNode } from "react";
import type { BreakdownRow } from "@/lib/analytics/types";

/** ISO-2 country code -> flag emoji (regional indicator letters). */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🌐";
  const A = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(A + up.charCodeAt(0) - 65, A + up.charCodeAt(1) - 65);
}

/**
 * A titled card listing the top values of one dimension (paths, referrers,
 * countries, …) as horizontal bars — the same shape Vercel Analytics uses for
 * its breakdowns.
 */
export default function BreakdownList({
  title,
  items,
  keyHeader = "Page",
  renderKey,
  monoKey = false,
}: {
  title: string;
  items: BreakdownRow[];
  keyHeader?: string;
  renderKey?: (key: string) => ReactNode;
  monoKey?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.views));

  return (
    <div className="analytics-panel">
      <div className="analytics-panel__head">
        <span>{title}</span>
        <span className="analytics-panel__col">Views</span>
      </div>

      {items.length === 0 ? (
        <div className="analytics-panel__empty">No data yet.</div>
      ) : (
        <ul className="analytics-bars" aria-label={`${title} — ${keyHeader}`}>
          {items.map((row) => (
            <li key={row.key} className="analytics-bar">
              <div
                className="analytics-bar__fill"
                style={{ width: `${(row.views / max) * 100}%` }}
                aria-hidden
              />
              <span
                className={`analytics-bar__key${monoKey ? " is-mono" : ""}`}
                title={row.key}
              >
                {renderKey ? renderKey(row.key) : row.key}
              </span>
              <span className="analytics-bar__val">
                {row.views.toLocaleString("id-ID")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
