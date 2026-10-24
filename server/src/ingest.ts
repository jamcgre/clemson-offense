import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEAM } from "./constants";
import { cfbdList } from "./cfbd";
import { pool } from "./db";
import { yearsFromArgv } from "./ingestYears";
import { parseDrive, parseGame, parsePlay, parseSeasonStats, defenseOverallByTeam, withOpponentDefense } from "./parseApi";
import { replaceSeason } from "./queries";
import type { DriveRow, GameRow, PlayRow, SeasonPpaRow } from "./types";

type YearPayload = {
  games: GameRow[];
  drives: DriveRow[];
  plays: PlayRow[];
  season: SeasonPpaRow | null;
};

export async function ingestSeasons(years: number[]): Promise<void> {
  console.log(`Loading Clemson offense for ${years.join(", ")}.`);

  for (const year of years) {
    const payload = await fetchYear(year);
    if (payload.games.length === 0 && payload.drives.length === 0 && payload.plays.length === 0 && !payload.season) {
      console.warn(`${year}: no data returned; left the database unchanged.`);
      continue;
    }
    await replaceSeason(year, payload);
    const ppa = payload.season?.overall;
    console.log(
      `${year}: ${payload.games.length} games, ${payload.drives.length} drives, ${payload.plays.length} plays, PPA ${
        ppa == null ? "n/a" : ppa.toFixed(3)
      }.`,
    );
  }

  console.log("Ingest complete.");
}

async function fetchYear(year: number): Promise<YearPayload> {
  const team = encodeURIComponent(TEAM);
  const gameRows = await cfbdList(`/games?year=${year}&team=${team}&seasonType=both`);
  const games = dedupe(gameRows.map(parseGame).filter((game): game is GameRow => game != null)).filter(
    (game) =>
      (game.seasonType === "regular" || game.seasonType === "postseason") &&
      (game.homeTeam.toLowerCase() === TEAM.toLowerCase() || game.awayTeam.toLowerCase() === TEAM.toLowerCase()),
  );
  const gameIds = new Set(games.map((game) => game.id));

  const driveRows = await cfbdList(`/drives?year=${year}&offense=${team}&seasonType=both`);
  const drives = dedupe(
    driveRows
      .map((row) => parseDrive(row, year))
      .filter((drive): drive is DriveRow => drive != null && gameIds.has(drive.gameId)),
  );

  const slices = new Map<string, { week: number; seasonType: string }>();
  for (const game of games) {
    slices.set(`${game.seasonType}:${game.week}`, { week: game.week, seasonType: game.seasonType });
  }

  const plays: PlayRow[] = [];
  for (const slice of slices.values()) {
    const seasonType = encodeURIComponent(slice.seasonType);
    const playRows = await cfbdList(
      `/plays?year=${year}&week=${slice.week}&seasonType=${seasonType}&offense=${team}`,
      { allowNotFound: true },
    );
    for (const row of playRows) {
      const play = parsePlay(row, year, slice.week);
      if (play && gameIds.has(play.gameId)) plays.push(play);
    }
  }

  const ppaRows = await cfbdList(`/ppa/teams?year=${year}`);
  const ratedGames = withOpponentDefense(games, defenseOverallByTeam(ppaRows));
  let advancedRows: Record<string, unknown>[] = [];
  try {
    advancedRows = await cfbdList(`/stats/season/advanced?year=${year}&team=${team}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Advanced stats unavailable for ${year}: ${message}`);
  }

  return {
    games: ratedGames,
    drives,
    plays: dedupe(plays),
    season: parseSeasonStats(year, ppaRows, advancedRows),
  };
}

function dedupe<T extends { id: number | string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(entry);
}

if (isDirectRun()) {
  ingestSeasons(yearsFromArgv(process.argv.slice(2)))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
