import { describe, expect, it } from "vitest";
import { diagnose, formatBaselineLabel, RULES } from "./diagnosis";
import type { SeasonSnapshot } from "./types";

const now = new Date(2026, 9, 20);

describe("diagnose", () => {
  it("averages 2018–2020 and flags a later drop past the threshold", () => {
    const result = diagnose({
      now,
      seasons: [
        season({ season: 2018 }),
        season({ season: 2019 }),
        season({ season: 2020 }),
        season({ season: 2024, successRate: 0.25, havocAllowed: 0.25 }),
      ],
    });

    expect(result.baseline.successRate).toBeCloseTo(0.5);
    expect(result.baselineLabel).toBe("2018–2020");
    const success = result.findings.find((finding) => finding.metric === "successRate");
    const havoc = result.findings.find((finding) => finding.metric === "havocAllowed");
    expect(success?.summary).toBe(
      "2024 success rate was 25.0%, 25.0 percentage points below the 2018–2020 average of 50.0%.",
    );
    expect(havoc?.summary).toContain("above the 2018–2020 average");
    expect(result.findings[0].metric).toBe("successRate");
    expect(result.summary).toBe(
      "2024 trails the 2018–2020 offense most on success rate, then havoc rate allowed.",
    );
  });

  it("does not flag a move inside the threshold", () => {
    const result = diagnose({
      now,
      seasons: [
        season({ season: 2018 }),
        season({ season: 2019 }),
        season({ season: 2020 }),
        season({ season: 2024, successRate: 0.47 }),
      ],
    });
    expect(result.findings).toEqual([]);
    expect(result.summary).toBe("2024 is close to the 2018–2020 peak on every measure with enough plays to compare.");
  });

  it("does not flag a drop when the sample is too small", () => {
    const result = diagnose({
      now,
      seasons: [
        season({ season: 2018 }),
        season({ season: 2019 }),
        season({ season: 2020 }),
        season({
          season: 2024,
          successRate: 0.1,
          scrimmagePlays: 20,
          earlyDownPlays: 10,
          driveCount: 3,
          redZoneTrips: 1,
          hasOfficialPpa: false,
          hasHavoc: false,
          ppa: 0,
          havocAllowed: null,
        }),
      ],
    });
    expect(result.findings).toEqual([]);
  });

  it("does not treat the peak seasons as findings", () => {
    const result = diagnose({
      now,
      seasons: [season({ season: 2018, successRate: 0.2 }), season({ season: 2019 }), season({ season: 2020 })],
    });
    expect(result.findings).toEqual([]);
    expect(result.summary).toContain("inside the 2018–2020 peak window");
  });

  it("says when the current season is still in progress", () => {
    const result = diagnose({
      now,
      seasons: [
        season({ season: 2018 }),
        season({ season: 2019 }),
        season({ season: 2020 }),
        season({ season: 2026, successRate: 0.25, partial: true }),
      ],
    });
    expect(result.summary).toBe(
      "2026 trails the 2018–2020 offense most on success rate. The 2026 season is still in progress.",
    );
  });

  it("asks for the peak window when those seasons are missing", () => {
    const result = diagnose({ now, seasons: [season({ season: 2024, successRate: 0.2 })] });
    expect(result.findings).toEqual([]);
    expect(result.summary).toBe("The 2018–2020 peak is not loaded, so there is nothing to compare yet.");
  });
});

describe("formatBaselineLabel", () => {
  it("joins a gap with commas and a run with a dash", () => {
    expect(formatBaselineLabel([2020, 2018])).toBe("2018, 2020");
    expect(formatBaselineLabel([2018, 2019, 2020])).toBe("2018–2020");
  });
});

describe("rule thresholds", () => {
  it("keeps the published cutoffs", () => {
    expect(RULES.map((rule) => [rule.metric, rule.threshold, rule.worseWhen])).toEqual([
      ["successRate", 0.04, "lower"],
      ["earlyDownSuccessRate", 0.04, "lower"],
      ["explosiveRate", 0.03, "lower"],
      ["pointsPerDrive", 0.4, "lower"],
      ["redZoneScoreRate", 0.08, "lower"],
      ["ppa", 0.08, "lower"],
      ["havocAllowed", 0.03, "higher"],
    ]);
  });
});

function season(overrides: Partial<SeasonSnapshot> & Pick<SeasonSnapshot, "season">): SeasonSnapshot {
  return {
    partial: false,
    games: 13,
    wins: 10,
    losses: 3,
    ties: 0,
    scrimmagePlays: 800,
    earlyDownPlays: 600,
    driveCount: 150,
    redZoneTrips: 40,
    hasOfficialPpa: true,
    hasHavoc: true,
    successRate: 0.5,
    earlyDownSuccessRate: 0.52,
    explosiveRate: 0.14,
    yardsPerPlay: 6,
    pointsPerDrive: 2.8,
    redZoneScoreRate: 0.88,
    redZoneTdRate: 0.62,
    ppa: 0.3,
    havocAllowed: 0.15,
    passSuccessRate: 0.48,
    rushSuccessRate: 0.52,
    passPlays: 400,
    rushPlays: 400,
    opponentDefensePpa: null,
    ratedGames: 0,
    ...overrides,
  };
}
