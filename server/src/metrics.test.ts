import { describe, expect, it } from "vitest";
import { classifyPlay, drivePoints, driveScored, isExplosive, isSuccessful, pointsPerDrive } from "./metrics";
import type { DriveRow } from "./types";

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
    scoring: false,
    ...overrides,
  };
}
