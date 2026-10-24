import { describe, expect, it } from "vitest";
import { classifyPlay, drivePoints, driveScored, getNonGarbageTimeData, isExplosive, isGarbageTime, isSuccessful, pointsPerDrive } from "./metrics";
import type { DriveRow, PlayRow } from "./types";

describe("classifyPlay", () => {
  it("keeps rushes and passes, including sacks", () => {
    expect(classifyPlay("Rush", "Rush for 4 yards")).toBe("rush");
    expect(classifyPlay("Rushing Touchdown", "Rush for 8 yards for a TD")).toBe("rush");
    expect(classifyPlay("Pass Reception", "Pass complete")).toBe("pass");
    expect(classifyPlay("Sack", "Sacked for a loss")).toBe("pass");
    expect(classifyPlay("Interception", "Pass intercepted")).toBe("pass");
  });

  it("drops special teams, penalties, returns, kneels, and spikes", () => {
    expect(classifyPlay("Kickoff", "Kickoff")).toBeNull();
    expect(classifyPlay("Punt Return", "Punt return")).toBeNull();
    expect(classifyPlay("Penalty", "Penalty")).toBeNull();
    expect(classifyPlay("Pass Interception Return", "Return")).toBeNull();
    expect(classifyPlay("Two Point Rush", "Two point")).toBeNull();
    expect(classifyPlay("Rush", "Clemson kneels to end the half")).toBeNull();
    expect(classifyPlay("Pass Incompletion", "Klubnik spiked the ball")).toBeNull();
  });
});

describe("isSuccessful", () => {
  it("uses 50 percent, 70 percent, and the full distance", () => {
    expect(isSuccessful(1, 10, 5)).toBe(true);
    expect(isSuccessful(1, 10, 4)).toBe(false);
    expect(isSuccessful(2, 10, 7)).toBe(true);
    expect(isSuccessful(2, 10, 6)).toBe(false);
    expect(isSuccessful(3, 8, 8)).toBe(true);
    expect(isSuccessful(3, 8, 7)).toBe(false);
    expect(isSuccessful(4, 1, 1)).toBe(true);
  });

  it("treats a distance under one yard as one yard", () => {
    expect(isSuccessful(3, 0, 1)).toBe(true);
    expect(isSuccessful(3, 0, 0)).toBe(false);
  });
});

describe("drive scoring", () => {
  it("counts touchdowns and made field goals only", () => {
    expect(driveScored("TD")).toBe("td");
    expect(driveScored("FG")).toBe("fg");
    expect(driveScored("MISSED FG")).toBeNull();
    expect(driveScored("PUNT")).toBeNull();
    expect(driveScored("INT")).toBeNull();
  });

  it("uses the scoreboard delta, including extra points", () => {
    expect(drivePoints({ startOffenseScore: 0, endOffenseScore: 7, driveResult: "TD" })).toBe(7);
    expect(drivePoints({ startOffenseScore: 7, endOffenseScore: 7, driveResult: "INT" })).toBe(0);
  });

  it("leaves scoreless end-of-half drives out of points per drive", () => {
    const drives = [
      drive({ id: "a", plays: 8, startOffenseScore: 0, endOffenseScore: 7, driveResult: "TD" }),
      drive({ id: "b", plays: 2, startOffenseScore: 7, endOffenseScore: 7, driveResult: "END OF HALF" }),
    ];
    expect(pointsPerDrive(drives)).toBe(7);
  });
});

describe("isExplosive", () => {
  it("flags gains of 15 yards or more", () => {
    expect(isExplosive(15)).toBe(true);
    expect(isExplosive(14)).toBe(false);
  });
});

describe("garbage time", () => {
  it("marks the fourth quarter or later when Clemson leads by 17 or more", () => {
    expect(isGarbageTime({ startOffenseScore: 31, startDefenseScore: 14, startPeriod: 4 })).toBe(true);
    expect(isGarbageTime({ startOffenseScore: 31, startDefenseScore: 14, startPeriod: 5 })).toBe(true);
    expect(isGarbageTime({ startOffenseScore: 30, startDefenseScore: 14, startPeriod: 4 })).toBe(false);
    expect(isGarbageTime({ startOffenseScore: 31, startDefenseScore: 14, startPeriod: 3 })).toBe(false);
    expect(isGarbageTime({ startOffenseScore: 14, startDefenseScore: 31, startPeriod: 4 })).toBe(false);
  });

  it("returns null when the score or period is missing", () => {
    expect(isGarbageTime({ startOffenseScore: 31, startDefenseScore: null, startPeriod: 4 })).toBeNull();
    expect(isGarbageTime({ startOffenseScore: 31, startDefenseScore: 14, startPeriod: null })).toBeNull();
  });

  it("drops garbage-time drives and their plays, and keeps a drive with a missing score", () => {
    const competitive = drive({ id: "keep", startOffenseScore: 7, startDefenseScore: 7, startPeriod: 4 });
    const garbage = drive({ id: "drop", startOffenseScore: 31, startDefenseScore: 14, startPeriod: 4 });
    const unknown = drive({ id: "unknown", startOffenseScore: null, startDefenseScore: null, startPeriod: null });
    const plays = [
      play({ id: "p1", driveId: "keep" }),
      play({ id: "p2", driveId: "drop" }),
      play({ id: "p3", driveId: null }),
    ];

    const filtered = getNonGarbageTimeData([competitive, garbage, unknown], plays);

    expect(filtered.drives.map((row) => row.id)).toEqual(["keep", "unknown"]);
    expect(filtered.plays.map((row) => row.id)).toEqual(["p1"]);
  });
});

function drive(overrides: Partial<DriveRow> & Pick<DriveRow, "id">): DriveRow {
  return {
    gameId: 1,
    season: 2024,
    offense: "Clemson",
    defense: "Wake Forest",
    driveNumber: 1,
    plays: 1,
    yards: 0,
    driveResult: "PUNT",
    startYardsToGoal: 75,
    endYardsToGoal: 70,
    startOffenseScore: 0,
    endOffenseScore: 0,
    startDefenseScore: 0,
    startPeriod: 1,
    scoring: false,
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
