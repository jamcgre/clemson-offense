import { describe, expect, it } from "vitest";
import { yearsFromArgv } from "./ingestYears";
import { defenseOverallByTeam, parseGame, parsePlay, parseSeasonStats, withOpponentDefense } from "./parseApi";

describe("yearsFromArgv", () => {
  it("defaults to 2008 through 2026", () => {
    expect(yearsFromArgv([])).toEqual([2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  });

  it("keeps requested seasons inside that window", () => {
    expect(yearsFromArgv(["2024", "2010", "2007", "2025"])).toEqual([2024, 2010, 2025]);
    expect(() => yearsFromArgv(["1999"])).toThrow(/2008/);
  });
});

describe("parseApi", () => {
  it("reads a game, a Clemson play, and season PPA with havoc", () => {
    const game = parseGame({
      id: 401282614,
      season: 2024,
      week: 1,
      seasonType: "regular",
      startDate: "2024-08-31T23:30:00.000Z",
      neutralSite: false,
      homeTeam: "Clemson",
      homePoints: 66,
      awayTeam: "Georgia",
      awayPoints: 20,
      venue: "Memorial Stadium",
      completed: true,
    });
    expect(game?.homeTeam).toBe("Clemson");
    expect(game?.awayPoints).toBe(20);

    const play = parsePlay(
      {
        id: "401282614101",
        driveId: "4012826141",
        gameId: 401282614,
        offense: "Clemson",
        defense: "Georgia",
        down: 1,
        distance: 10,
        yardsToGoal: 75,
        yardsGained: 8,
        playType: "Rush",
        playText: "Rush for 8 yards",
        ppa: 0.21,
        scoring: false,
        period: 1,
      },
      2024,
      1,
    );
    expect(play?.yardsGained).toBe(8);
    expect(parsePlay({ id: "x", gameId: 1, offense: "Georgia", defense: "Clemson" }, 2024, 1)).toBeNull();

    const season = parseSeasonStats(
      2024,
      [
        {
          season: 2024,
          team: "Clemson",
          conference: "ACC",
          offense: {
            overall: 0.22,
            passing: 0.18,
            rushing: 0.11,
            firstDown: 0.2,
            secondDown: 0.1,
            thirdDown: 0.05,
            cumulative: { total: 140, passing: 80, rushing: 60 },
          },
        },
      ],
      [{ team: "Clemson", offense: { havoc: { total: 0.17, frontSeven: 0.1, db: 0.07 } } }],
    );
    expect(season?.overall).toBe(0.22);
    expect(season?.havocTotal).toBe(0.17);
    expect(season?.cumulativePassing).toBe(80);
  });

  it("stores the opponent's defense.overall and skips a team missing from the list", () => {
    const atGeorgia = parseGame({
      id: 1,
      season: 2024,
      week: 1,
      homeTeam: "Georgia",
      awayTeam: "Clemson",
      homePoints: 10,
      awayPoints: 24,
    });
    const wofford = parseGame({
      id: 2,
      season: 2024,
      week: 2,
      homeTeam: "Clemson",
      awayTeam: "Wofford",
    });
    if (!atGeorgia || !wofford) throw new Error("expected both games to parse");

    const ratings = defenseOverallByTeam([
      { team: "Clemson", defense: { overall: 0.11 } },
      { team: "Georgia", defense: { overall: -0.08 } },
    ]);
    const [georgia, missing] = withOpponentDefense([atGeorgia, wofford], ratings);

    expect(georgia.opponentDefensePpa).toBe(-0.08);
    expect(missing.opponentDefensePpa).toBeNull();
  });
});
