import { EXPLOSIVE_YARDS, TEAM } from "./constants";
import type { DriveRow, GameRow, PlayKind, PlayRow, RateBlock } from "./types";

export function classifyPlay(playType: string | null, playText: string | null): PlayKind | null {
  const type = (playType ?? "").trim().toLowerCase();
  const text = (playText ?? "").toLowerCase();
  if (!type) return null;
  if (text.includes("kneel") || text.includes("spiked the ball") || text.includes("spikes the ball")) {
    return null;
  }
  if (
    type.includes("kickoff") ||
    type.includes("punt") ||
    type.includes("field goal") ||
    type.includes("extra point") ||
    type.includes("timeout") ||
    type.includes("penalty") ||
    type.includes("two point") ||
    type.includes("two-point") ||
    type.startsWith("end") ||
    type.includes("return") ||
    type.includes("fumble") ||
    type.includes("kneel") ||
    type.includes("uncategorized") ||
    type.includes("placeholder") ||
    type.includes("safety")
  ) {
    return null;
  }
  if (type.includes("sack") || type.includes("pass") || type.includes("interception")) return "pass";
  if (type.includes("rush")) return "rush";
  return null;
}

export function isScrimmage(play: Pick<PlayRow, "playType" | "playText" | "down" | "yardsGained">): boolean {
  if (play.down == null || play.down < 1 || play.down > 4) return false;
  if (play.yardsGained == null) return false;
  return classifyPlay(play.playType, play.playText) != null;
}

export function isSuccessful(down: number, distance: number, yardsGained: number): boolean {
  const needed = distance < 1 ? 1 : distance;
  if (down === 1) return yardsGained >= 0.5 * needed;
  if (down === 2) return yardsGained >= 0.7 * needed;
  if (down === 3 || down === 4) return yardsGained >= needed;
  return false;
}

export function isExplosive(yardsGained: number): boolean {
  return yardsGained >= EXPLOSIVE_YARDS;
}

export function inRedZone(yardsToGoal: number | null, scoring = false): boolean {
  if (yardsToGoal == null) return false;
  if (yardsToGoal >= 1 && yardsToGoal <= 20) return true;
  return yardsToGoal === 0 && scoring;
}

export function rateBlock(plays: PlayRow[]): RateBlock {
  const scrimmage = plays.filter(isScrimmage);
  if (scrimmage.length === 0) {
    return { plays: 0, successRate: null, explosiveRate: null, yardsPerPlay: null, avgPpa: null };
  }

  let successes = 0;
  let explosives = 0;
  let yards = 0;
  let ppaSum = 0;
  let ppaCount = 0;

  for (const play of scrimmage) {
    const gained = play.yardsGained ?? 0;
    const distance = play.distance ?? 0;
    const down = play.down ?? 0;
    if (isSuccessful(down, distance, gained)) successes += 1;
    if (isExplosive(gained)) explosives += 1;
    yards += gained;
    if (play.ppa != null) {
      ppaSum += play.ppa;
      ppaCount += 1;
    }
  }

  return {
    plays: scrimmage.length,
    successRate: successes / scrimmage.length,
    explosiveRate: explosives / scrimmage.length,
    yardsPerPlay: yards / scrimmage.length,
    avgPpa: ppaCount > 0 ? ppaSum / ppaCount : null,
  };
}

export function driveScored(result: string | null): "td" | "fg" | null {
  const value = (result ?? "").trim().toUpperCase();
  if (value === "TD" || value === "TOUCHDOWN") return "td";
  if (value === "FG" || value === "FIELD GOAL" || value === "FIELD GOAL GOOD") return "fg";
  return null;
}

export function drivePoints(drive: Pick<DriveRow, "startOffenseScore" | "endOffenseScore" | "driveResult">): number {
  if (drive.startOffenseScore != null && drive.endOffenseScore != null) {
    return Math.max(0, drive.endOffenseScore - drive.startOffenseScore);
  }
  const scored = driveScored(drive.driveResult);
  if (scored === "td") return 6;
  if (scored === "fg") return 3;
  return 0;
}

export function isClockDrive(drive: DriveRow): boolean {
  const result = (drive.driveResult ?? "").trim().toUpperCase();
  if (!result.startsWith("END OF")) return false;
  return drivePoints(drive) <= 0;
}

export function countableDrives(drives: DriveRow[]): DriveRow[] {
  return drives.filter((drive) => {
    if (isClockDrive(drive)) return false;
    if (drive.plays == null) return true;
    return drive.plays > 0;
  });
}

export function pointsPerDrive(drives: DriveRow[]): number | null {
  const usable = countableDrives(drives);
  if (usable.length === 0) return null;
  const points = usable.reduce((sum, drive) => sum + drivePoints(drive), 0);
  return points / usable.length;
}

export function redZoneTrips(drives: DriveRow[], plays: PlayRow[]): DriveRow[] {
  const reached = new Set<string>();
  for (const play of plays) {
    if (!play.driveId || !isScrimmage(play)) continue;
    if (inRedZone(play.yardsToGoal, play.scoring)) reached.add(play.driveId);
  }
  return countableDrives(drives).filter((drive) => {
    const start = drive.startYardsToGoal;
    if (start != null && start >= 1 && start <= 20) return true;
    return reached.has(drive.id);
  });
}

export function gameResult(game: Pick<GameRow, "homeTeam" | "awayTeam" | "homePoints" | "awayPoints">): "W" | "L" | "T" | null {
  if (game.homePoints == null || game.awayPoints == null) return null;
  if (game.homeTeam !== TEAM && game.awayTeam !== TEAM) return null;
  const ours = game.homeTeam === TEAM ? game.homePoints : game.awayPoints;
  const theirs = game.homeTeam === TEAM ? game.awayPoints : game.homePoints;
  if (ours > theirs) return "W";
  if (ours < theirs) return "L";
  return "T";
}
