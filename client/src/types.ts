export type MetricKey =
  | "successRate"
  | "earlyDownSuccessRate"
  | "explosiveRate"
  | "pointsPerDrive"
  | "redZoneScoreRate"
  | "ppa"
  | "havocAllowed";

export type MetricAverages = Record<MetricKey, number | null>;

export type SeasonSnapshot = {
  season: number;
  partial: boolean;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  scrimmagePlays: number;
  earlyDownPlays: number;
  driveCount: number;
  redZoneTrips: number;
  successRate: number | null;
  earlyDownSuccessRate: number | null;
  explosiveRate: number | null;
  yardsPerPlay: number | null;
  pointsPerDrive: number | null;
  redZoneScoreRate: number | null;
  redZoneTdRate: number | null;
  ppa: number | null;
  havocAllowed: number | null;
  passSuccessRate: number | null;
  rushSuccessRate: number | null;
  opponentDefensePpa: number | null;
  ratedGames: number;
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
  diagnosisExcludingGarbageTime?: Diagnosis;
};

export type RateBlock = {
  plays: number;
  successRate: number | null;
  explosiveRate: number | null;
  yardsPerPlay: number | null;
  avgPpa: number | null;
};

export type SplitRow = RateBlock & { label: string };

export type YearDetail = {
  season: number;
  partial: boolean;
  summary: SeasonSnapshot;
  summaryExcludingGarbageTime: SeasonSnapshot;
  baseline: MetricAverages;
  baselineLabel: string;
  splits: {
    byDown: SplitRow[];
    byPlayType: SplitRow[];
    redZone: RateBlock & {
      trips: number;
      scoreRate: number | null;
      tdRate: number | null;
    };
  };  
  splitsExcludingGarbageTime?: YearDetail['splits'];
  diagnosisExcludingGarbageTime?: Diagnosis;
};

export type GameLogRow = {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string | null;
  opponent: string;
  site: "home" | "away" | "neutral";
  clemsonPoints: number | null;
  opponentPoints: number | null;
  result: "W" | "L" | "T" | null;
  plays: number;
  successRate: number | null;
  explosiveRate: number | null;
  pointsPerDrive: number | null;
  avgPpa: number | null;
  opponentDefensePpa: number | null;
};
