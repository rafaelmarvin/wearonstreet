import type { TimeseriesPoint } from "@/lib/analytics/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07-14T09:00" -> parts (all values are already WIB wall-clock). */
function parts(bucket: string) {
  const [date, time = "00:00"] = bucket.split("T");
  const [y, m, d] = date.split("-");
  return {
    day: Number(d),
    mon: MONTHS[Number(m) - 1] ?? m,
    year: y,
    time,
  };
}

function axisLabel(bucket: string, mode: "hour" | "day"): string {
  const p = parts(bucket);
  return mode === "hour" ? p.time : `${p.day} ${p.mon}`;
}

function tooltipLabel(bucket: string, mode: "hour" | "day"): string {
  const p = parts(bucket);
  return mode === "hour"
    ? `${p.day} ${p.mon}, ${p.time}`
    : `${p.day} ${p.mon} ${p.year}`;
}

/**
 * Dependency-free SVG chart: views as bars, visitors as an overlaid line.
 * Rendered on the server; native <title> elements give hover tooltips with
 * zero client JavaScript.
 */
export default function AnalyticsChart({
  data,
  bucket,
}: {
  data: TimeseriesPoint[];
  bucket: "hour" | "day";
}) {
  const W = 760;
  const H = 240;
  const padL = 6;
  const padR = 6;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  const n = data.length;
  if (n === 0) {
    return <div className="analytics-empty">No pageviews in this range yet.</div>;
  }

  const yMax = Math.max(1, ...data.map((d) => d.views));
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(46, slot * 0.62));

  const x = (i: number) => padL + slot * i + slot / 2;
  const y = (v: number) => baseY - (v / yMax) * plotH;

  const visitorsPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.visitors).toFixed(1)}`)
    .join(" ");

  // A handful of evenly spaced x labels so they never collide.
  const maxLabels = 7;
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));

  // Gridlines at 0 / 50% / 100% of the max.
  const gridVals = [0, Math.round(yMax / 2), yMax].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div className="analytics-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Pageviews over time"
      >
        {/* gridlines + y labels */}
        {gridVals.map((v) => {
          const gy = y(v);
          return (
            <g key={v}>
              <line
                x1={padL}
                x2={W - padR}
                y1={gy}
                y2={gy}
                className="analytics-chart__grid"
              />
              <text x={padL} y={gy - 3} className="analytics-chart__ylabel">
                {v}
              </text>
            </g>
          );
        })}

        {/* views bars */}
        {data.map((d, i) => {
          const bx = x(i) - barW / 2;
          const by = y(d.views);
          const bh = Math.max(0, baseY - by);
          return (
            <g key={d.bucket}>
              <rect
                x={bx.toFixed(1)}
                y={by.toFixed(1)}
                width={barW.toFixed(1)}
                height={bh.toFixed(1)}
                rx={Math.min(3, barW / 2)}
                className="analytics-chart__bar"
              />
              {/* invisible full-height hit area for a friendlier tooltip target */}
              <rect
                x={(x(i) - slot / 2).toFixed(1)}
                y={padT}
                width={slot.toFixed(1)}
                height={plotH}
                fill="transparent"
              >
                <title>
                  {tooltipLabel(d.bucket, bucket)} — {d.views} views,{" "}
                  {d.visitors} visitors
                </title>
              </rect>
            </g>
          );
        })}

        {/* visitors line */}
        {n > 1 && (
          <path d={visitorsPath} className="analytics-chart__line" fill="none" />
        )}
        {data.map((d, i) => (
          <circle
            key={`p-${d.bucket}`}
            cx={x(i).toFixed(1)}
            cy={y(d.visitors).toFixed(1)}
            r={n > 40 ? 0 : 2.5}
            className="analytics-chart__dot"
          />
        ))}

        {/* x labels */}
        {data.map((d, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={`x-${d.bucket}`}
              x={x(i).toFixed(1)}
              y={H - 8}
              textAnchor="middle"
              className="analytics-chart__xlabel"
            >
              {axisLabel(d.bucket, bucket)}
            </text>
          ) : null,
        )}
      </svg>

      <div className="analytics-legend">
        <span className="analytics-legend__item">
          <span className="analytics-legend__swatch analytics-legend__swatch--bar" />
          Views
        </span>
        <span className="analytics-legend__item">
          <span className="analytics-legend__swatch analytics-legend__swatch--line" />
          Visitors
        </span>
      </div>
    </div>
  );
}
