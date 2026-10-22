import { describe, expect, it } from "vitest";
import { liveSeasonYear } from "./seasonClock";

describe("liveSeasonYear", () => {
  it("uses the calendar year from August through December", () => {
    expect(liveSeasonYear(new Date(2026, 9, 21))).toBe(2026);
    expect(liveSeasonYear(new Date(2026, 7, 1))).toBe(2026);
  });

  it("keeps January with the season that started the previous fall", () => {
    expect(liveSeasonYear(new Date(2027, 0, 10))).toBe(2026);
  });

  it("skips the offseason", () => {
    expect(liveSeasonYear(new Date(2026, 2, 1))).toBeNull();
    expect(liveSeasonYear(new Date(2026, 6, 31))).toBeNull();
  });
});
