import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getJson } from "../api";
import { SetupNotice } from "../components/SetupNotice";
import { fixed, formatDate, opponentLabel, pct, record, scoreLine, weekLabel } from "../format";
import type { GameLogRow, YearDetail } from "../types";

export function Season() {
  const { year: yearParam } = useParams();
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
  const [detail, setDetail] = useState<YearDetail | null>(null);
  const [games, setGames] = useState<GameLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (year == null) return;
    let cancelled = false;
    setDetail(null);
    setGames(null);
    setError(null);
    Promise.all([
      getJson<YearDetail>(`/api/seasons/${year}`),
      getJson<{ games: GameLogRow[] }>(`/api/seasons/${year}/games`),
    ])
      .then(([yearDetail, gameLog]) => {
        if (cancelled) return;
        setDetail(yearDetail);
        setGames(gameLog.games);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  if (year == null) return <p className="status">That season is not a four-digit year.</p>;
  if (error) {
    const needsSetup = /postgres|database|api is not running|could not be reached/i.test(error);
    return needsSetup ? <SetupNotice message={error} /> : <p className="status">{error}</p>;
  }
  if (!detail || !games) return <p className="status">Loading {year}…</p>;

  const { summary } = detail;

  return (
    <>
      <p className="kicker">
        {record(summary.wins, summary.losses, summary.ties)}
        {summary.partial ? " · in progress" : ""}
        {summary.scrimmagePlays > 0 ? ` · ${summary.scrimmagePlays} scrimmage plays` : ""}
      </p>
      <h1>{detail.season} offense</h1>

      <div className="tiles">
        <Tile label="Success rate" value={pct(summary.successRate)} />
        <Tile label="Explosive rate" value={pct(summary.explosiveRate)} />
        <Tile label="Points per drive" value={fixed(summary.pointsPerDrive)} />
        <Tile label="PPA per play" value={fixed(summary.ppa)} />
      </div>

      <section className="panel">
        <h2>By down</h2>
        <SplitTable
          rows={detail.splits.byDown.map((row) => ({
            label: row.label,
            plays: row.plays,
            successRate: row.successRate,
            explosiveRate: row.explosiveRate,
            yardsPerPlay: row.yardsPerPlay,
            avgPpa: row.avgPpa,
          }))}
        />
      </section>

      <section className="panel">
        <h2>Pass and rush</h2>
        <SplitTable rows={detail.splits.byPlayType} />
      </section>

      <section className="panel">
        <h2>Red zone</h2>
        <div className="tiles compact">
          <Tile label="Trips" value={String(detail.splits.redZone.trips)} />
          <Tile label="Score rate" value={pct(detail.splits.redZone.scoreRate)} />
          <Tile label="Touchdown rate" value={pct(detail.splits.redZone.tdRate)} />
          <Tile label="Success rate" value={pct(detail.splits.redZone.successRate)} />
        </div>
      </section>

      <section className="panel">
        <h2>Games</h2>
        {games.length === 0 ? (
          <p className="muted">No games stored for this season.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">{detail.season} game log</caption>
              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th scope="col">Date</th>
                  <th scope="col">Opponent</th>
                  <th scope="col">Result</th>
                  <th scope="col">Plays</th>
                  <th scope="col">Success</th>
                  <th scope="col">Explosive</th>
                  <th scope="col">Pts/drive</th>
                  <th scope="col">Avg PPA</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <th scope="row">{weekLabel(game.week, game.seasonType)}</th>
                    <td>{formatDate(game.startDate)}</td>
                    <td className="text">{opponentLabel(game.site, game.opponent)}</td>
                    <td>{scoreLine(game.result, game.clemsonPoints, game.opponentPoints)}</td>
                    <td>{game.plays}</td>
                    <td>{pct(game.successRate)}</td>
                    <td>{pct(game.explosiveRate)}</td>
                    <td>{fixed(game.pointsPerDrive)}</td>
                    <td>{fixed(game.avgPpa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="chart-note">Game PPA is the average on Clemson scrimmage plays. Season PPA above is the CollegeFootballData season figure when that file has one.</p>
      </section>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <article className="tile">
      <h3>{label}</h3>
      <p className="tile-value">{value}</p>
    </article>
  );
}

function SplitTable({
  rows,
}: {
  rows: {
    label: string;
    plays: number;
    successRate: number | null;
    explosiveRate: number | null;
    yardsPerPlay: number | null;
    avgPpa: number | null;
  }[];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Split</th>
            <th scope="col">Plays</th>
            <th scope="col">Success</th>
            <th scope="col">Explosive</th>
            <th scope="col">Yards/play</th>
            <th scope="col">Avg PPA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.plays}</td>
              <td>{pct(row.successRate)}</td>
              <td>{pct(row.explosiveRate)}</td>
              <td>{fixed(row.yardsPerPlay, 1)}</td>
              <td>{fixed(row.avgPpa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
