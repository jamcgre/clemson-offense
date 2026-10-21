export function pct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function fixed(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function record(wins: number, losses: number, ties: number): string {
  if (wins + losses + ties === 0) return "—";
  if (ties > 0) return `${wins}–${losses}–${ties}`;
  return `${wins}–${losses}`;
}

export function rateGap(value: number | null, baseline: number | null): string | null {
  if (value == null || baseline == null) return null;
  const points = (value - baseline) * 100;
  const sign = points > 0 ? "+" : "";
  return `${sign}${points.toFixed(1)} pts`;
}

export function numberGap(value: number | null, baseline: number | null): string | null {
  if (value == null || baseline == null) return null;
  const gap = value - baseline;
  const sign = gap > 0 ? "+" : "";
  return `${sign}${gap.toFixed(2)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export function weekLabel(week: number, seasonType: string): string {
  if (seasonType === "regular") return `Wk ${week}`;
  return `Post ${week}`;
}

export function opponentLabel(site: "home" | "away" | "neutral", opponent: string): string {
  if (site === "away") return `@ ${opponent}`;
  if (site === "neutral") return `vs ${opponent} (n)`;
  return `vs ${opponent}`;
}

export function scoreLine(result: "W" | "L" | "T" | null, ours: number | null, theirs: number | null): string {
  if (ours == null || theirs == null) return "—";
  return `${result ? `${result} ` : ""}${ours}–${theirs}`;
}
