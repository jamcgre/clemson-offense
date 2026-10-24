import { describe, expect, it } from "vitest";
import { buildGameLog, buildSnapshot, buildSplits } from "./aggregate";
import type { DriveRow, GameRow, PlayRow } from "./types";

const now = new Date(2025, 2, 1);

describe("buildSnapshot", () => {
  it("scores scrimmage plays and ignores kicks, kneels, and end-of-half drives", () => {
    const plays = [
      play({ id: "1", down: 1, distance: 10, yardsGained: 6, yardsToGoal: 75, playType: "Rush", ppa: 0.2 }),
      play({
        id: "2",
        down: 1,
        distance: 10,
        yardsGained: 16,
        yardsToGoal: 69,
        playType: "Pass Reception",
        ppa: 0.8,
      }),
      play({ id: "3", down: 2, distance: 10, yardsGained: 6, yardsToGoal: 53, playType: "Rush", ppa: -0.1 }),
      play({
        id: "4",
        driveId: "d2",
        down: 3,
        distance: 4,
        yardsGained: 4,
        yardsToGoal: 18,
        playType: "Pass Reception",
        ppa: 0.4,
      }),
      play({ id: "5", down: null, yardsGained: 20, playType: "Kickoff", yardsToGoal: 75 }),
      play({ id: "6", down: 1, yardsGained: -1, playType: "Rush", playText: "Clemson kneels" }),
    ];
    const drives = [
      drive({ id: "d1", plays: 8, startOffenseScore: 0, endOffenseScore: 7, driveResult: "TD", startYardsToGoal: 75 }),
      drive({ id: "d2", plays: 4, startOffenseScore: 7, endOffenseScore: 10, driveResult: "FG", startYardsToGoal: 15 }),
      drive({ id: "d3", plays: 3, startOffenseScore: 10, endOffenseScore: 10, driveResult: "PUNT", startYardsToGoal: 40 }),
      drive({
        id: "d4",
        plays: 2,
        startOffenseScore: 10,
        endOffenseScore: 10,
        driveResult: "END OF HALF",
        startYardsToGoal: 30,
      }),
    ];

    const snapshot = buildSnapshot(2024, plays, drives, [], undefined, now);
    expect(snapshot.scrimmagePlays).toBe(4);
    expect(snapshot.successRate).toBeCloseTo(0.75);
    expect(snapshot.explosiveRate).toBeCloseTo(0.25);
    expect(snapshot.earlyDownSuccessRate).toBeCloseTo(2 / 3);
    expect(snapshot.yardsPerPlay).toBeCloseTo(8);
    expect(snapshot.passSuccessRate).toBe(1);
    expect(snapshot.rushSuccessRate).toBe(0.5);
    expect(snapshot.pointsPerDrive).toBeCloseTo(10 / 3);
    expect(snapshot.redZoneTrips).toBe(1);
    expect(snapshot.redZoneScoreRate).toBe(1);
    expect(snapshot.ppa).toBeCloseTo((0.2 + 0.8 - 0.1 + 0.4) / 4);
    expect(snapshot.partial).toBe(false);
  });

  it("counts a drive that reaches the red zone, and prefers official PPA", () => {
    const plays = [
      play({ id: "rz", driveId: "reach", down: 1, distance: 10, yardsGained: 2, yardsToGoal: 12, playType: "Rush" }),
    ];
    const drives = [
      drive({ id: "reach", plays: 6, driveResult: "DOWNS", startYardsToGoal: 40, startOffenseScore: 0, endOffenseScore: 0 }),
      drive({ id: "made", plays: 3, driveResult: "FG", startYardsToGoal: 12, startOffenseScore: 0, endOffenseScore: 3 }),
    ];
    const snapshot = buildSnapshot(
      2024,
      plays,
      drives,
      [],
      {
        season: 2024,
        team: "Clemson",
        conference: "ACC",
        overall: 0.41,
        passing: 0.3,
        rushing: 0.1,
        firstDown: null,
        secondDown: null,
        thirdDown: null,
        cumulativeTotal: null,
        cumulativePassing: null,
        cumulativeRushing: null,
        havocTotal: 0.19,
        havocFrontSeven: 0.11,
        havocDb: 0.08,
      },
      now,
    );
    expect(snapshot.redZoneTrips).toBe(2);
    expect(snapshot.redZoneScoreRate).toBe(0.5);
    expect(snapshot.ppa).toBe(0.41);
    expect(snapshot.hasOfficialPpa).toBe(true);
    expect(snapshot.havocAllowed).toBe(0.19);
  });

  it("averages opponent defense ratings and skips a game with no rating", () => {
    const games = [
      game({ id: 1, opponentDefensePpa: -0.08 }),
      game({ id: 2, opponentDefensePpa: 0.2 }),
      game({ id: 3, opponentDefensePpa: null }),
    ];
    const snapshot = buildSnapshot(2024, [], [], games, undefined, now);
    expect(snapshot.opponentDefensePpa).toBeCloseTo(0.06);
    expect(snapshot.ratedGames).toBe(2);
  });

  it("leaves opponent defense empty when no game has a rating", () => {
    const snapshot = buildSnapshot(2024, [], [], [game({ id: 1, opponentDefensePpa: null })], undefined, now);
    expect(snapshot.opponentDefensePpa).toBeNull();
    expect(snapshot.ratedGames).toBe(0);
  });
});

describe("buildSplits and buildGameLog", () => {
  it("splits by down and lists the opponent from Clemson's side of the score", () => {
    const plays = [
      play({ id: "1", gameId: 10, down: 1, yardsGained: 6, playType: "Rush", ppa: 0.2 }),
      play({ id: "2", gameId: 10, down: 3, distance: 5, yardsGained: 5, playType: "Pass Reception", ppa: 0.5 }),
    ];
    const games: GameRow[] = [
      {
        id: 10,
        season: 2024,
        week: 2,
        seasonType: "regular",
        startDate: "2024-09-07T23:30:00.000Z",
        homeTeam: "Clemson",
        awayTeam: "Appalachian State",
        homePoints: 66,
        awayPoints: 20,
        venue: "Memorial Stadium",
        neutralSite: false,
        completed: true,
        opponentDefensePpa: null,
      },
    ];
    const splits = buildSplits(plays, []);
    expect(splits.byDown.find((row) => row.label === "1st")?.plays).toBe(1);
    expect(splits.byPlayType.find((row) => row.label === "Pass")?.successRate).toBe(1);

    const [game] = buildGameLog(games, plays, []);
    expect(game.opponent).toBe("Appalachian State");
    expect(game.site).toBe("home");
    expect(game.result).toBe("W");
    expect(game.clemsonPoints).toBe(66);
    expect(game.plays).toBe(2);
    expect(game.avgPpa).toBeCloseTo(0.35);
  });
});

function game(overrides: Partial<GameRow> & Pick<GameRow, "id">): GameRow {
  return {
    season: 2024,
    week: 1,
    seasonType: "regular",
    startDate: "2024-09-07T23:30:00.000Z",
    homeTeam: "Clemson",
    awayTeam: "Wake Forest",
    homePoints: 24,
    awayPoints: 10,
    venue: "Memorial Stadium",
    neutralSite: false,
    completed: true,
    opponentDefensePpa: null,
    ...overrides,
  };
}

function play(overrides: Partial<PlayRow> & Pick<PlayRow, "id">): PlayRow {
  return {
    gameId: 1,
    driveId: "d1",
    season: 2024,
    week: 1,
    offense: "Clemson",
    defense: "Wake Forest",
    down: 1,
    distance: 10,
    yardsToGoal: 75,
    yardsGained: 4,
    playType: "Rush",
    playText: "Rush",
    ppa: 0.1,
    scoring: false,
    period: 1,
    ...overrides,
  };
}

function drive(overrides: Partial<DriveRow> & Pick<DriveRow, "id">): DriveRow {
  return {
    gameId: 1,
    season: 2024,
    offense: "Clemson",
    defense: "Wake Forest",
    driveNumber: 1,
    plays: 1,
    yards: 10,
    driveResult: "PUNT",
    startYardsToGoal: 75,
    endYardsToGoal: 60,
    startOffenseScore: 0,
    endOffenseScore: 0,
    scoring: false,
    ...overrides,
  };
}
