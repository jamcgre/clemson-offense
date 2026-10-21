import { SEASONS } from "./constants";

export function yearsFromArgv(argv: string[]): number[] {
  const requested = argv.map(Number).filter((year) => Number.isInteger(year));
  if (requested.length === 0) return [...SEASONS];

  const allowed = requested.filter((year) => SEASONS.includes(year));
  const rejected = requested.filter((year) => !SEASONS.includes(year));
  if (rejected.length > 0) {
    console.warn(`Skipping years outside 2018–2026: ${rejected.join(", ")}`);
  }
  if (allowed.length === 0) {
    throw new Error("No valid seasons to ingest. Use years from 2018 through 2026.");
  }
  return allowed;
}
