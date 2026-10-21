import { BASELINE_SEASONS } from "./constants";
import { isSeasonPartial } from "./seasonClock";
import type { SeasonSnapshot } from "./types";

export type MetricKey =
  | "successRate"
  | "earlyDownSuccessRate"
  | "explosiveRate"
  | "pointsPerDrive"
  | "redZoneScoreRate"
  | "ppa"
  | "havocAllowed";

export type MetricAverages = Record<MetricKey, number | null>;

export type RuleUnit = "rate" | "points" | "ppa";

type Rule = {
  metric: MetricKey;
  label: string;
  worseWhen: "lower" | "higher";
  threshold: number;
  unit: RuleUnit;
  minimum: number;
  minimumLabel: string;
  sample: (season: SeasonSnapshot) => number;
};

export const RULES: Rule[] = [
  {
    metric: "successRate",
    label: "Success rate",
    worseWhen: "lower",
    threshold: 0.04,
    unit: "rate",
    minimum: 100,
    minimumLabel: "100 scrimmage plays",
    sample: (season) => season.scrimmagePlays,
  },
  {
    metric: "earlyDownSuccessRate",
    label: "Early-down success rate",
    worseWhen: "lower",
    threshold: 0.04,
    unit: "rate",
    minimum: 80,
    minimumLabel: "80 early-down plays",
    sample: (season) => season.earlyDownPlays,
  },
  {
    metric: "explosiveRate",
    label: "Explosive play rate",
    worseWhen: "lower",
    threshold: 0.03,
    unit: "rate",
    minimum: 100,
    minimumLabel: "100 scrimmage plays",
    sample: (season) => season.scrimmagePlays,
  },
  {
    metric: "pointsPerDrive",
    label: "Points per drive",
    worseWhen: "lower",
    threshold: 0.4,
    unit: "points",
    minimum: 20,
    minimumLabel: "20 drives",
    sample: (season) => season.driveCount,
  },
  {
    metric: "redZoneScoreRate",
    label: "Red zone score rate",
    worseWhen: "lower",
    threshold: 0.08,
    unit: "rate",
    minimum: 8,
    minimumLabel: "8 red zone trips",
    sample: (season) => season.redZoneTrips,
  },
  {
    metric: "ppa",
    label: "Predicted points added per play",
    worseWhen: "lower",
    threshold: 0.08,
    unit: "ppa",
    minimum: 1,
    minimumLabel: "a season PPA value and 100 scrimmage plays, unless the PPA came from CollegeFootballData",
    sample: (season) => (season.hasOfficialPpa || season.scrimmagePlays >= 100 ? 1 : 0),
  },
  {
    metric: "havocAllowed",
    label: "Havoc rate allowed",
    worseWhen: "higher",
    threshold: 0.03,
    unit: "rate",
    minimum: 1,
    minimumLabel: "a CollegeFootballData havoc rate",
    sample: (season) => (season.hasHavoc ? 1 : 0),
  },
];

export type PublicRule = {
  metric: MetricKey;
  label: string;
  worseWhen: "lower" | "higher";
  threshold: number;
  unit: RuleUnit;
  minimumLabel: string;
};

export type Finding = {
  id: string;
  season: number;
  metric: MetricKey;
  label: string;
  value: number;
  baseline: number;
  delta: number;
  worseWhen: "lower" | "higher";
  summary: string;
};

export type Diagnosis = {
  baselineSeasons: number[];
  baselineLabel: string;
  baseline: MetricAverages;
  seasons: SeasonSnapshot[];
  findings: Finding[];
  summary: string;
  rules: PublicRule[];
};

export function publicRules(): PublicRule[] {
  return RULES.map(({ metric, label, worseWhen, threshold, unit, minimumLabel }) => ({
    metric,
    label,
    worseWhen,
    threshold,
    unit,
    minimumLabel,
  }));
}

export function emptyAverages(): MetricAverages {
  return {
    successRate: null,
    earlyDownSuccessRate: null,
    explosiveRate: null,
    pointsPerDrive: null,
    redZoneScoreRate: null,
    ppa: null,
    havocAllowed: null,
  };
}

export function diagnose(input: { seasons: SeasonSnapshot[]; now?: Date }): Diagnosis {
  const now = input.now ?? new Date();
  const seasons = [...input.seasons].sort((a, b) => a.season - b.season);
  const rules = publicRules();
  if (seasons.length === 0) {
    return {
      baselineSeasons: [],
      baselineLabel: "2018–2020",
      baseline: emptyAverages(),
      seasons: [],
      findings: [],
      summary: "No seasons are loaded yet.",
      rules,
    };
  }

  const baselineSeasons = seasons.filter((season) => BASELINE_SEASONS.includes(season.season));
  const baselineYears = baselineSeasons.map((season) => season.season);
  const label = formatBaselineLabel(baselineYears);
  const baseline = averageMetrics(baselineSeasons);
  const findings = baselineYears.length === 0 ? [] : collectFindings(seasons, baseline, label);
  const summary =
    baselineYears.length === 0
      ? "The 2018–2020 peak is not loaded, so there is nothing to compare yet."
      : summarize(seasons, findings, baselineYears, label, now);

  return {
    baselineSeasons: baselineYears,
    baselineLabel: label,
    baseline,
    seasons,
    findings,
    summary,
    rules,
  };
}

function averageMetrics(seasons: SeasonSnapshot[]): MetricAverages {
  const averages = emptyAverages();
  for (const rule of RULES) {
    const values = seasons
      .map((season) => season[rule.metric])
      .filter((value): value is number => value != null);
    averages[rule.metric] = values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return averages;
}

function collectFindings(seasons: SeasonSnapshot[], baseline: MetricAverages, label: string): Finding[] {
  const findings: Finding[] = [];
  for (const season of seasons) {
    if (season.season <= 2020) continue;
    for (const rule of RULES) {
      const value = season[rule.metric];
      const base = baseline[rule.metric];
      if (value == null || base == null) continue;
      if (rule.sample(season) < rule.minimum) continue;
      const delta = value - base;
      const worse = rule.worseWhen === "lower" ? delta <= -rule.threshold : delta >= rule.threshold;
      if (!worse) continue;
      findings.push({
        id: `${season.season}-${rule.metric}`,
        season: season.season,
        metric: rule.metric,
        label: rule.label,
        value,
        baseline: base,
        delta,
        worseWhen: rule.worseWhen,
        summary: describeFinding(rule, season.season, value, base, label),
      });
    }
  }

  return findings.sort((a, b) => {
    if (a.season !== b.season) return b.season - a.season;
    return severity(b) - severity(a);
  });
}

function severity(finding: Finding): number {
  const gap = finding.worseWhen === "lower" ? finding.baseline - finding.value : finding.value - finding.baseline;
  const rule = RULES.find((item) => item.metric === finding.metric);
  return gap / (rule?.threshold ?? 1);
}

function summarize(
  seasons: SeasonSnapshot[],
  findings: Finding[],
  baselineYears: number[],
  label: string,
  now: Date,
): string {
  const comparable = seasons.filter(hasComparableStats);
  if (comparable.length === 0) return "No offensive stats are loaded yet.";
  if (baselineYears.length === 0) {
    return "No 2018–2020 seasons are loaded, so there is no peak window to compare.";
  }

  const latest = comparable[comparable.length - 1];
  if (latest.season <= 2020) {
    return `The loaded seasons are inside the ${label} peak window, so there is no later season to compare yet.`;
  }

  const latestFindings = findings.filter((finding) => finding.season === latest.season);
  let text: string;
  if (latestFindings.length === 0) {
    text = `${latest.season} is close to the ${label} peak on every measure with enough plays to compare.`;
  } else if (latestFindings.length === 1) {
    text = `${latest.season} trails the ${label} offense most on ${latestFindings[0].label.toLowerCase()}.`;
  } else {
    text = `${latest.season} trails the ${label} offense most on ${latestFindings[0].label.toLowerCase()}, then ${latestFindings[1].label.toLowerCase()}.`;
  }

  if (isSeasonPartial(latest.season, now)) {
    text += ` The ${latest.season} season is still in progress.`;
  }
  return text;
}

function hasComparableStats(season: SeasonSnapshot): boolean {
  return season.scrimmagePlays > 0 || season.ppa != null || season.havocAllowed != null || season.driveCount > 0;
}

export function formatBaselineLabel(years: number[]): string {
  if (years.length === 0) return "2018–2020";
  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  const contiguous = sorted.every((year, index) => index === 0 || year === sorted[index - 1] + 1);
  if (contiguous) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  return sorted.join(", ");
}

function describeFinding(rule: Rule, season: number, value: number, baseline: number, label: string): string {
  const gap = Math.abs(value - baseline);
  if (rule.unit === "rate") {
    const direction = rule.worseWhen === "lower" ? "below" : "above";
    return `${season} ${rule.label.toLowerCase()} was ${formatRate(value)}, ${formatRatePoints(gap)} ${direction} the ${label} average of ${formatRate(baseline)}.`;
  }
  if (rule.unit === "ppa") {
    return `${season} predicted points added per play was ${value.toFixed(2)}, ${gap.toFixed(2)} below the ${label} average of ${baseline.toFixed(2)}.`;
  }
  return `${season} points per drive were ${value.toFixed(2)}, ${gap.toFixed(2)} below the ${label} average of ${baseline.toFixed(2)}.`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRatePoints(gap: number): string {
  return `${(gap * 100).toFixed(1)} percentage points`;
}
