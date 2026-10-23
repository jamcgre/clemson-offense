import { TEAM } from "./constants";
import { asRecord, read, toBoolean, toIso, toNumber, toText } from "./numbers";
import type { DriveRow, GameRow, PlayRow, SeasonPpaRow } from "./types";

export function parseGame(row: Record<string, unknown>): GameRow | null {
  const id = toNumber(read(row, "id"));
  const season = toNumber(read(row, "season"));
  const week = toNumber(read(row, "week"));
  const homeTeam = toText(read(row, "homeTeam", "home_team"));
  const awayTeam = toText(read(row, "awayTeam", "away_team"));
  if (id == null || season == null || week == null || !homeTeam || !awayTeam) return null;

  const homePoints = toNumber(read(row, "homePoints", "home_points"));
  const awayPoints = toNumber(read(row, "awayPoints", "away_points"));
  const completedRaw = read(row, "completed");
  const seasonType = toText(read(row, "seasonType", "season_type")) ?? "regular";

  return {
    id,
    season,
    week,
    seasonType,
    startDate: toIso(read(row, "startDate", "start_date")),
    homeTeam,
    awayTeam,
    homePoints,
    awayPoints,
    venue: toText(read(row, "venue")),
    neutralSite: toBoolean(read(row, "neutralSite", "neutral_site")),
    completed: completedRaw == null ? homePoints != null && awayPoints != null : toBoolean(completedRaw),
  };
}

export function parseDrive(row: Record<string, unknown>, season: number): DriveRow | null {
  const idValue = read(row, "id");
  const id = idValue == null ? null : String(idValue);
  const gameId = toNumber(read(row, "gameId", "game_id"));
  const offense = toText(read(row, "offense"));
  const defense = toText(read(row, "defense"));
  if (!id || gameId == null || !offense || !defense) return null;
  if (offense.toLowerCase() !== TEAM.toLowerCase()) return null;


  return {
    id,
    gameId,
    season,
    offense,
    defense,
    driveNumber: toNumber(read(row, "driveNumber", "drive_number")),
    plays: toNumber(read(row, "plays")),
    yards: toNumber(read(row, "yards")),
    driveResult: toText(read(row, "driveResult", "drive_result")),
    startYardsToGoal: toNumber(read(row, "startYardsToGoal", "start_yards_to_goal")),
    endYardsToGoal: toNumber(read(row, "endYardsToGoal", "end_yards_to_goal")),
    startOffenseScore: toNumber(read(row, "startOffenseScore", "start_offense_score")),
    endOffenseScore: toNumber(read(row, "endOffenseScore", "end_offense_score")),
    startDefenseScore: toNumber(read(row, "startDefenseScore", "start_defense_score")),
    startPeriod: toNumber(read(row, "startPeriod", "start_period")),
    scoring: toBoolean(read(row, "scoring")),
  };
}

export function parsePlay(row: Record<string, unknown>, season: number, week: number): PlayRow | null {
  const idValue = read(row, "id");
  const id = idValue == null ? null : String(idValue);
  const gameId = toNumber(read(row, "gameId", "game_id"));
  const offense = toText(read(row, "offense"));
  const defense = toText(read(row, "defense"));
  if (!id || gameId == null || !offense || !defense) return null;
  if (offense.toLowerCase() !== TEAM.toLowerCase()) return null;

  const driveRaw = read(row, "driveId", "drive_id");
  return {
    id,
    gameId,
    driveId: driveRaw == null ? null : String(driveRaw),
    season,
    week: toNumber(read(row, "week")) ?? week,
    offense,
    defense,
    down: toNumber(read(row, "down")),
    distance: toNumber(read(row, "distance")),
    yardsToGoal: toNumber(read(row, "yardsToGoal", "yards_to_goal")),
    yardsGained: toNumber(read(row, "yardsGained", "yards_gained")),
    playType: toText(read(row, "playType", "play_type")),
    playText: toText(read(row, "playText", "play_text")),
    ppa: toNumber(read(row, "ppa")),
    scoring: toBoolean(read(row, "scoring")),
    period: toNumber(read(row, "period")),
  };
}

export function parseSeasonStats(
  season: number,
  ppaRows: Record<string, unknown>[],
  advancedRows: Record<string, unknown>[],
): SeasonPpaRow | null {
  const ppa = pickTeam(ppaRows);
  const advanced = pickTeam(advancedRows);
  if (!ppa && !advanced) return null;

  const offense = asRecord(ppa ? read(ppa, "offense") : null);
  const cumulative = asRecord(offense ? read(offense, "cumulative") : null);
  const advancedOffense = asRecord(advanced ? read(advanced, "offense") : null);
  const havoc = asRecord(advancedOffense ? read(advancedOffense, "havoc") : null);

  const row: SeasonPpaRow = {
    season,
    team: TEAM,
    conference: toText(ppa ? read(ppa, "conference") : null) ?? toText(advanced ? read(advanced, "conference") : null),
    overall: toNumber(offense ? read(offense, "overall") : null),
    passing: toNumber(offense ? read(offense, "passing") : null),
    rushing: toNumber(offense ? read(offense, "rushing") : null),
    firstDown: toNumber(offense ? read(offense, "firstDown", "first_down") : null),
    secondDown: toNumber(offense ? read(offense, "secondDown", "second_down") : null),
    thirdDown: toNumber(offense ? read(offense, "thirdDown", "third_down") : null),
    cumulativeTotal: toNumber(cumulative ? read(cumulative, "total") : null),
    cumulativePassing: toNumber(cumulative ? read(cumulative, "passing") : null),
    cumulativeRushing: toNumber(cumulative ? read(cumulative, "rushing") : null),
    havocTotal: toNumber(havoc ? read(havoc, "total") : null),
    havocFrontSeven: toNumber(havoc ? read(havoc, "frontSeven", "front_seven") : null),
    havocDb: toNumber(havoc ? read(havoc, "db") : null),
  };

  const hasValue = [
    row.overall,
    row.passing,
    row.rushing,
    row.havocTotal,
    row.havocFrontSeven,
    row.havocDb,
  ].some((value) => value != null);
  return hasValue ? row : null;
}

function pickTeam(rows: Record<string, unknown>[]): Record<string, unknown> | null {
  const match = rows.find((row) => {
    const team = toText(read(row, "team"));
    return team != null && team.toLowerCase() === TEAM.toLowerCase();
  });
  if (match) return match;
  const unlabeled = rows.find((row) => toText(read(row, "team")) == null);
  return unlabeled ?? null;
}
