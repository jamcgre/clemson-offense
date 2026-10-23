export type PlayKind = "pass" | "rush";

export type PlayRow = {
  id: string;
  gameId: number;
  driveId: string | null;
  season: number;
  week: number | null;
  offense: string;
  defense: string;
  down: number | null;
  distance: number | null;
  yardsToGoal: number | null;
  yardsGained: number | null;
  playType: string | null;
  playText: string | null;
  ppa: number | null;
  scoring: boolean;
  period: number | null;
};

export type DriveRow = {
  id: string;
  gameId: number;
  season: number;
  offense: string;
  defense: string;
  driveNumber: number | null;
  plays: number | null;
  yards: number | null;
  driveResult: string | null;
  startYardsToGoal: number | null;
  endYardsToGoal: number | null;
  startOffenseScore: number | null;
  endOffenseScore: number | null;
  startDefenseScore: number | null;
  startPeriod: number | null;
  scoring: boolean;
};

export type GameRow = {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string | null;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
  venue: string | null;
  neutralSite: boolean;
  completed: boolean;
};

export type SeasonPpaRow = {
  season: number;
  team: string;
  conference: string | null;
  overall: number | null;
  passing: number | null;
  rushing: number | null;
  firstDown: number | null;
  secondDown: number | null;
  thirdDown: number | null;
  cumulativeTotal: number | null;
  cumulativePassing: number | null;
  cumulativeRushing: number | null;
  havocTotal: number | null;
  havocFrontSeven: number | null;
  havocDb: number | null;
};

export type RateBlock = {
  plays: number;
  successRate: number | null;
  explosiveRate: number | null;
  yardsPerPlay: number | null;
  avgPpa: number | null;
};

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
  hasOfficialPpa: boolean;
  hasHavoc: boolean;
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
  passPlays: number;
  rushPlays: number;
};

export type SplitRow = RateBlock & {
  label: string;
};

export type RedZoneSplit = {
  plays: number;
  successRate: number | null;
  explosiveRate: number | null;
  yardsPerPlay: number | null;
  avgPpa: number | null;
  trips: number;
  scoreRate: number | null;
  tdRate: number | null;
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
};

export type Dataset = {
  plays: PlayRow[];
  drives: DriveRow[];
  games: GameRow[];
  seasonPpa: SeasonPpaRow[];
};
