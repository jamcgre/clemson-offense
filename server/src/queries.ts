import type { PoolClient } from "pg";
import { ensureSchema, friendlyDatabaseMessage, pool } from "./db";
import { toBoolean, toIso, toNumber, toText } from "./numbers";
import type { Dataset, DriveRow, GameRow, PlayRow, SeasonPpaRow } from "./types";

let pending: Promise<Dataset> | null = null;

export function queryDataset(): Promise<Dataset> {
  if (!pending) {
    pending = readDataset().finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function readDataset(): Promise<Dataset> {
  await ensureSchema();
  const [games, drives, plays, seasonPpa] = await Promise.all([
    pool.query("SELECT * FROM games ORDER BY season, week, id"),
    pool.query("SELECT * FROM drives WHERE offense = 'Clemson' ORDER BY season, drive_number"),
    pool.query("SELECT * FROM plays WHERE offense = 'Clemson' ORDER BY season, week, id"),
    pool.query("SELECT * FROM season_ppa ORDER BY season"),
  ]);
  return {
    games: games.rows.map(mapGame),
    drives: drives.rows.map(mapDrive),
    plays: plays.rows.map(mapPlay),
    seasonPpa: seasonPpa.rows.map(mapSeason),
  };
}

export async function replaceSeason(
  year: number,
  data: { games: GameRow[]; drives: DriveRow[]; plays: PlayRow[]; season: SeasonPpaRow | null },
): Promise<void> {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM plays WHERE season = $1", [year]);
    await client.query("DELETE FROM drives WHERE season = $1", [year]);
    await client.query("DELETE FROM games WHERE season = $1", [year]);
    await client.query("DELETE FROM season_ppa WHERE season = $1", [year]);
    await insertRows(
      client,
      "games",
      [
        "id",
        "season",
        "week",
        "season_type",
        "start_date",
        "home_team",
        "away_team",
        "home_points",
        "away_points",
        "venue",
        "neutral_site",
        "completed",
      ],
      data.games.map((game) => [
        game.id,
        game.season,
        game.week,
        game.seasonType,
        game.startDate,
        game.homeTeam,
        game.awayTeam,
        game.homePoints,
        game.awayPoints,
        game.venue,
        game.neutralSite,
        game.completed,
      ]),
    );
    await insertRows(
      client,
      "drives",
      [
        "id",
        "game_id",
        "season",
        "offense",
        "defense",
        "drive_number",
        "plays",
        "yards",
        "drive_result",
        "start_yards_to_goal",
        "end_yards_to_goal",
        "start_offense_score",
        "end_offense_score",
        "scoring",
      ],
      data.drives.map((drive) => [
        drive.id,
        drive.gameId,
        drive.season,
        drive.offense,
        drive.defense,
        drive.driveNumber,
        drive.plays,
        drive.yards,
        drive.driveResult,
        drive.startYardsToGoal,
        drive.endYardsToGoal,
        drive.startOffenseScore,
        drive.endOffenseScore,
        drive.scoring,
      ]),
    );
    await insertRows(
      client,
      "plays",
      [
        "id",
        "game_id",
        "drive_id",
        "season",
        "week",
        "offense",
        "defense",
        "down",
        "distance",
        "yards_to_goal",
        "yards_gained",
        "play_type",
        "play_text",
        "ppa",
        "scoring",
        "period",
      ],
      data.plays.map((play) => [
        play.id,
        play.gameId,
        play.driveId,
        play.season,
        play.week,
        play.offense,
        play.defense,
        play.down,
        play.distance,
        play.yardsToGoal,
        play.yardsGained,
        play.playType,
        play.playText,
        play.ppa,
        play.scoring,
        play.period,
      ]),
    );
    if (data.season) {
      const season = data.season;
      await client.query(
        `INSERT INTO season_ppa (
          season, team, conference, overall, passing, rushing, first_down, second_down, third_down,
          cumulative_total, cumulative_passing, cumulative_rushing, havoc_total, havoc_front_seven, havoc_db
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )`,
        [
          season.season,
          season.team,
          season.conference,
          season.overall,
          season.passing,
          season.rushing,
          season.firstDown,
          season.secondDown,
          season.thirdDown,
          season.cumulativeTotal,
          season.cumulativePassing,
          season.cumulativeRushing,
          season.havocTotal,
          season.havocFrontSeven,
          season.havocDb,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection is already unusable.
    }
    throw error;
  } finally {
    client.release();
  }
}

export function explainDatabaseError(error: unknown): string {
  console.error(error);
  return friendlyDatabaseMessage(error);
}

async function insertRows(client: PoolClient, table: string, columns: string[], rows: unknown[][]): Promise<void> {
  const width = columns.length;
  const size = 300;
  for (let index = 0; index < rows.length; index += size) {
    const slice = rows.slice(index, index + size);
    const values: unknown[] = [];
    const groups = slice.map((row, rowIndex) => {
      const placeholders = row.map((value, columnIndex) => {
        values.push(value);
        return `$${rowIndex * width + columnIndex + 1}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${groups.join(", ")}`, values);
  }
}

function mapGame(row: Record<string, unknown>): GameRow {
  return {
    id: toNumber(row.id) ?? 0,
    season: toNumber(row.season) ?? 0,
    week: toNumber(row.week) ?? 0,
    seasonType: toText(row.season_type) ?? "regular",
    startDate: toIso(row.start_date),
    homeTeam: toText(row.home_team) ?? "",
    awayTeam: toText(row.away_team) ?? "",
    homePoints: toNumber(row.home_points),
    awayPoints: toNumber(row.away_points),
    venue: toText(row.venue),
    neutralSite: toBoolean(row.neutral_site),
    completed: toBoolean(row.completed),
  };
}

function mapDrive(row: Record<string, unknown>): DriveRow {
  return {
    id: row.id == null ? "" : String(row.id),
    gameId: toNumber(row.game_id) ?? 0,
    season: toNumber(row.season) ?? 0,
    offense: toText(row.offense) ?? "",
    defense: toText(row.defense) ?? "",
    driveNumber: toNumber(row.drive_number),
    plays: toNumber(row.plays),
    yards: toNumber(row.yards),
    driveResult: toText(row.drive_result),
    startYardsToGoal: toNumber(row.start_yards_to_goal),
    endYardsToGoal: toNumber(row.end_yards_to_goal),
    startOffenseScore: toNumber(row.start_offense_score),
    endOffenseScore: toNumber(row.end_offense_score),
    scoring: toBoolean(row.scoring),
  };
}

function mapPlay(row: Record<string, unknown>): PlayRow {
  return {
    id: row.id == null ? "" : String(row.id),
    gameId: toNumber(row.game_id) ?? 0,
    driveId: row.drive_id == null ? null : String(row.drive_id),
    season: toNumber(row.season) ?? 0,
    week: toNumber(row.week),
    offense: toText(row.offense) ?? "",
    defense: toText(row.defense) ?? "",
    down: toNumber(row.down),
    distance: toNumber(row.distance),
    yardsToGoal: toNumber(row.yards_to_goal),
    yardsGained: toNumber(row.yards_gained),
    playType: toText(row.play_type),
    playText: toText(row.play_text),
    ppa: toNumber(row.ppa),
    scoring: toBoolean(row.scoring),
    period: toNumber(row.period),
  };
}

function mapSeason(row: Record<string, unknown>): SeasonPpaRow {
  return {
    season: toNumber(row.season) ?? 0,
    team: toText(row.team) ?? "Clemson",
    conference: toText(row.conference),
    overall: toNumber(row.overall),
    passing: toNumber(row.passing),
    rushing: toNumber(row.rushing),
    firstDown: toNumber(row.first_down),
    secondDown: toNumber(row.second_down),
    thirdDown: toNumber(row.third_down),
    cumulativeTotal: toNumber(row.cumulative_total),
    cumulativePassing: toNumber(row.cumulative_passing),
    cumulativeRushing: toNumber(row.cumulative_rushing),
    havocTotal: toNumber(row.havoc_total),
    havocFrontSeven: toNumber(row.havoc_front_seven),
    havocDb: toNumber(row.havoc_db),
  };
}
