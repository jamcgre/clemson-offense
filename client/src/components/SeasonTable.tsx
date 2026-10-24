import { Link } from "react-router-dom";
import { fixed, pct, record } from "../format";
import type { MetricAverages, MetricKey, SeasonSnapshot } from "../types";

const COLUMNS: { key: MetricKey; label: string; format: (value: number | null) => string }[] = [
  { key: "successRate", label: "Success", format: pct },
  { key: "earlyDownSuccessRate", label: "Early down", format: pct },
  { key: "explosiveRate", label: "Explosive", format: pct },
  { key: "pointsPerDrive", label: "Pts/drive", format: (value) => fixed(value, 2) },
  { key: "redZoneScoreRate", label: "Red zone", format: pct },
  { key: "ppa", label: "PPA", format: (value) => fixed(value, 2) },
  { key: "havocAllowed", label: "Havoc", format: pct },
];

const RATED_COLUMNS: {
  label: string; 
  value: (season:SeasonSnapshot) => number | null;
  format: (value: number | null) => string;
}[] = [
  { label: "Opp. defense PPA", 
    value: (season) => season.opponentDefensePpa, 
    format: (value) => fixed(value, 2) 
  },
  { label: "Rated games", 
    value: (season) => season.ratedGames, 
    format: (value) => (value == null ? "" : value.toString()) },
];

export function SeasonTable({
  seasons,
  baseline,
  baselineLabel,
}: {
  seasons: SeasonSnapshot[];
  baseline: MetricAverages;
  baselineLabel: string;
}) {
  const baselineYears = seasons.filter((season) =>
    season.season === 2018 || season.season === 2019 || season.season === 2020,
  );
  const rated = baselineYears
    .map((season) => season.opponentDefensePpa)
    .filter((value): value is number => value != null);
  const opponentDefenseBaseline = rated.length === 0
    ? null
    : rated.reduce((sum, value) => sum + value, 0) / rated.length;
  
  return (
    <section className="panel">
      <h2>Every season</h2>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Clemson offense by season compared with {baselineLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Season</th>
              <th scope="col">Record</th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
              {RATED_COLUMNS.map((column) => (
                <th key={column.label} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="baseline-row">
              <th scope="row">{baselineLabel}</th>
              <td>—</td>
              {COLUMNS.map((column) => (
                <td key={column.key}>{column.format(baseline[column.key])}</td>
              ))}
              {RATED_COLUMNS.map((column) => (
                <td key={column.label}>
                  {column.label === "Opp. defense PPA" ? column.format(opponentDefenseBaseline) : "—"}
                </td>
              ))}
            </tr>
            {seasons.map((season) => (
              <tr key={season.season}>
                <th scope="row">
                  <Link to={`/season/${season.season}`}>{season.season}</Link>
                  {season.partial ? <span className="badge">Live</span> : null}
                </th>
                <td>{record(season.wins, season.losses, season.ties)}</td>
                {COLUMNS.map((column) => (
                  <td key={column.key}>{column.format(season[column.key])}</td>
                ))}
                {RATED_COLUMNS.map((column) => (
                  <td key={column.label}>{column.format(column.value(season))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
