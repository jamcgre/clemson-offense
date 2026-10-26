import { TEAM } from "./constants";
import { diagnose, type Diagnosis, type MetricAverages } from "./diagnosis";
import {
  classifyPlay,
  countableDrives,
  driveScored,
  gameResult,
  inRedZone,
  pointsPerDrive,
  rateBlock,
  redZoneTrips,
} from "./metrics";
import { isSeasonPartial } from "./seasonClock";
import type {
  Dataset,
  DriveRow,
  GameLogRow,
  GameRow,
  PlayRow,
  RateBlock,
  RedZoneSplit,
  SeasonPpaRow,
  SeasonSnapshot,
  SplitRow,
} from "./types";

export type Splits = {
  byDown: SplitRow[];
  byPlayType: SplitRow[];
  redZone: RedZoneSplit;
};

export type YearDetail = {
  season: number;
  partial: boolean;
  summary: SeasonSnapshot;
  baseline: MetricAverages;
  baselineLabel: string;
  splits: Splits;
};

export type Report = {
  snapshots: SeasonSnapshot[];
  diagnosis: Diagnosis;
};

const DOWN_LABELS = ["1st", "2nd", "3rd", "4th"];

export function buildSnapshot(
  season: number,
  plays: PlayRow[],
  drives: DriveRow[],
  games: GameRow[],
  ppa: SeasonPpaRow | undefined,
  now = new Date(),
): SeasonSnapshot {
  const scrimmage = rateBlock(plays);
  const early = rateBlock(plays.filter((play) => play.down === 1 || play.down === 2));
  const pass = rateBlock(plays.filter((play) => classifyPlay(play.playType, play.playText) === "pass"));
  const rush = rateBlock(plays.filter((play) => classifyPlay(play.playType, play.playText) === "rush"));
  const trips = redZoneTrips(drives, plays);
  const scores = trips.filter((drive) => driveScored(drive.driveResult) != null).length;
  const touchdowns = trips.filter((drive) => driveScored(drive.driveResult) === "td").length;
  const record = recordFromGames(games);
  const officialPpa = ppa?.overall ?? null;
  const ratedGames = games.filter((game) => game.opponentDefensePpa != null).length;
  const opponentDefensePpa = ratedGames > 0 ? games.reduce((sum, game) => sum + (game.opponentDefensePpa ?? 0), 0) / ratedGames : null;

  return {
    season,
    partial: isSeasonPartial(season, now),
    games: games.length,
    ...record,
    scrimmagePlays: scrimmage.plays,
    earlyDownPlays: early.plays,
    driveCount: countableDrives(drives).length,
    redZoneTrips: trips.length,
    hasOfficialPpa: officialPpa != null,
    hasHavoc: ppa?.havocTotal != null,
    successRate: scrimmage.successRate,
    earlyDownSuccessRate: early.successRate,
    explosiveRate: scrimmage.explosiveRate,
    yardsPerPlay: scrimmage.yardsPerPlay,
    pointsPerDrive: pointsPerDrive(drives),
    redZoneScoreRate: trips.length > 0 ? scores / trips.length : null,
    redZoneTdRate: trips.length > 0 ? touchdowns / trips.length : null,
    ppa: officialPpa ?? scrimmage.avgPpa,
    havocAllowed: ppa?.havocTotal ?? null,
    passSuccessRate: pass.successRate,
    rushSuccessRate: rush.successRate,
    passPlays: pass.plays,
    rushPlays: rush.plays,
    opponentDefensePpa: opponentDefensePpa,
    ratedGames: ratedGames,
  };
}

export function buildSplits(plays: PlayRow[], drives: DriveRow[]): Splits {
  const byDown = [1, 2, 3, 4].map((down) => ({
    label: DOWN_LABELS[down - 1],
    ...rateBlock(plays.filter((play) => play.down === down)),
  }));
  const byPlayType = (["pass", "rush"] as const).map((kind) => ({
    label: kind === "pass" ? "Pass" : "Rush",
    ...rateBlock(plays.filter((play) => classifyPlay(play.playType, play.playText) === kind)),
  }));
  const redZonePlays = rateBlock(plays.filter((play) => inRedZone(play.yardsToGoal, play.scoring)));
  const trips = redZoneTrips(drives, plays);
  const scores = trips.filter((drive) => driveScored(drive.driveResult) != null).length;
  const touchdowns = trips.filter((drive) => driveScored(drive.driveResult) === "td").length;
  return {
    byDown,
    byPlayType,
    redZone: {
      ...redZonePlays,
      trips: trips.length,
      scoreRate: trips.length > 0 ? scores / trips.length : null,
      tdRate: trips.length > 0 ? touchdowns / trips.length : null,
    },
  };
}

export function buildGameLog(games: GameRow[], plays: PlayRow[], drives: DriveRow[]): GameLogRow[] {
  return [...games].sort(compareGames).map((game) => {
    const gamePlays = plays.filter((play) => play.gameId === game.id);
    const gameDrives = drives.filter((drive) => drive.gameId === game.id);
    const rates: RateBlock = rateBlock(gamePlays);
    const site = game.neutralSite ? "neutral" : game.homeTeam === TEAM ? "home" : "away";
    const opponent = game.homeTeam === TEAM ? game.awayTeam : game.homeTeam;
    return {
      id: game.id,
      season: game.season,
      week: game.week,
      seasonType: game.seasonType,
      startDate: game.startDate,
      opponent,
      site,
      clemsonPoints: game.homeTeam === TEAM ? game.homePoints : game.awayPoints,
      opponentPoints: game.homeTeam === TEAM ? game.awayPoints : game.homePoints,
      result: gameResult(game),
      plays: rates.plays,
      successRate: rates.successRate,
      explosiveRate: rates.explosiveRate,
      pointsPerDrive: pointsPerDrive(gameDrives),
      avgPpa: rates.avgPpa,
      opponentDefensePpa: game.opponentDefensePpa,
    };
  });
}

export function buildReport(dataset: Dataset, now = new Date()): Report {
  const years = new Set<number>();
  for (const game of dataset.games) years.add(game.season);
  for (const play of dataset.plays) years.add(play.season);
  for (const drive of dataset.drives) years.add(drive.season);
  for (const row of dataset.seasonPpa) years.add(row.season);

  const plays = groupBy(dataset.plays, (play) => play.season);
  const drives = groupBy(dataset.drives, (drive) => drive.season);
  const games = groupBy(dataset.games, (game) => game.season);
  const ppa = new Map(dataset.seasonPpa.map((row) => [row.season, row]));
  const snapshots = [...years]
    .sort((a, b) => a - b)
    .map((season) =>
      buildSnapshot(
        season,
        plays.get(season) ?? [],
        drives.get(season) ?? [],
        games.get(season) ?? [],
        ppa.get(season),
        now,
      ),
    );

  return {
    snapshots,
    diagnosis: diagnose({ seasons: snapshots, now }),
  };
}

export function seasonExists(dataset: Dataset, year: number): boolean {
  return (
    dataset.games.some((game) => game.season === year) ||
    dataset.plays.some((play) => play.season === year) ||
    dataset.drives.some((drive) => drive.season === year) ||
    dataset.seasonPpa.some((row) => row.season === year)
  );
}

function recordFromGames(games: GameRow[]): { wins: number; losses: number; ties: number } {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const game of games) {
    const result = gameResult(game);
    if (result === "W") wins += 1;
    else if (result === "L") losses += 1;
    else if (result === "T") ties += 1;
  }
  return { wins, losses, ties };
}

function compareGames(a: GameRow, b: GameRow): number {
  const rank = (seasonType: string) => (seasonType === "regular" ? 0 : 1);
  return rank(a.seasonType) - rank(b.seasonType) || a.week - b.week || a.id - b.id;
}

function groupBy<T>(rows: T[], key: (row: T) => number): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = grouped.get(id);
    if (list) list.push(row);
    else grouped.set(id, [row]);
  }
  return grouped;
}
