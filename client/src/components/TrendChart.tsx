import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fixed, pct } from "../format";
import type { MetricAverages, SeasonSnapshot } from "../types";

const METRICS = [
  { key: "successRate", label: "Success rate", format: pct },
  { key: "explosiveRate", label: "Explosive rate", format: pct },
  { key: "pointsPerDrive", label: "Points per drive", format: (value: number) => fixed(value, 2) },
  { key: "ppa", label: "PPA per play", format: (value: number) => fixed(value, 2) },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export function TrendChart({
  seasons,
  baseline,
  baselineLabel,
}: {
  seasons: SeasonSnapshot[];
  baseline: MetricAverages;
  baselineLabel: string;
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>("successRate");
  const metric = METRICS.find((item) => item.key === metricKey) ?? METRICS[0];
  const baselineValue = baseline[metric.key];
  const data = seasons.map((season) => ({
    season: season.season,
    value: season[metric.key],
  }));
  const numbers = data.map((row) => row.value).filter((value): value is number => value != null);
  if (baselineValue != null) numbers.push(baselineValue);
  const min = numbers.length ? Math.min(...numbers) : 0;
  const max = numbers.length ? Math.max(...numbers) : 1;
  const pad = (max - min) * 0.25 || Math.abs(max) * 0.1 || 0.02;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Season trend</h2>
        <div className="segmented" role="group" aria-label="Chart measure">
          {METRICS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === metric.key}
              onClick={() => setMetricKey(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {numbers.length === 0 ? (
        <p className="muted">This measure is not available yet.</p>
      ) : (
        <div className="chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e4d9c8" vertical={false} />
              <XAxis dataKey="season" tick={{ fill: "#655c68", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[min - pad, max + pad]}
                tick={{ fill: "#655c68", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value: number) => metric.format(value)}
              />
              <Tooltip
                formatter={(value) => {
                  const numeric = typeof value === "number" ? value : Number(value);
                  return Number.isFinite(numeric) ? metric.format(numeric) : "—";
                }}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  background: "#fffdf8",
                  border: "1px solid #e4d9c8",
                  borderRadius: 2,
                  fontSize: 13,
                }}
              />
              {baselineValue != null && (
                <ReferenceLine y={baselineValue} stroke="#F56600" strokeDasharray="4 4" />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#522D80"
                strokeWidth={2.5}
                connectNulls={false}
                dot={{ r: 4, fill: "#F56600", stroke: "#522D80", strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="chart-note">The dashed line is the {baselineLabel} average. Every measure is in the table below.</p>
    </section>
  );
}
