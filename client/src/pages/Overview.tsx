import { useEffect, useState } from "react";
import { getJson } from "../api";
import { SeasonTable } from "../components/SeasonTable";
import { SetupNotice } from "../components/SetupNotice";
import { TrendChart } from "../components/TrendChart";
import type { Diagnosis } from "../types";

export function Overview() {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<Diagnosis>("/api/diagnosis")
      .then((data) => {
        if (!cancelled) setDiagnosis(data);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <SetupNotice message={error} />;
  if (!diagnosis) return <p className="status">Loading the offense report…</p>;
  if (diagnosis.seasons.length === 0) return <SetupNotice empty />;

  const latest = [...diagnosis.seasons].sort((a, b) => a.season - b.season).at(-1);
  const latestFindings = diagnosis.findings.filter((finding) => finding.season === latest?.season);
  const earlier = diagnosis.findings.filter((finding) => finding.season !== latest?.season);

  return (
    <>
      <p className="kicker">2018–2026</p>
      <h1>What changed after the peak</h1>
      <p className="lede">{diagnosis.summary}</p>

      <section className="panel">
        <h2>{latest ? `${latest.season} findings` : "Findings"}</h2>
        {latestFindings.length === 0 ? (
          <p className="muted">No measure fell far enough past the {diagnosis.baselineLabel} baseline to flag.</p>
        ) : (
          <ol className="findings">
            {latestFindings.map((finding) => (
              <li key={finding.id}>
                <h3>{finding.label}</h3>
                <p>{finding.summary}</p>
              </li>
            ))}
          </ol>
        )}
        {earlier.length > 0 && (
          <details className="earlier">
            <summary>Earlier seasons since 2020 ({earlier.length})</summary>
            <ul>
              {earlier.map((finding) => (
                <li key={finding.id}>{finding.summary}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <TrendChart seasons={diagnosis.seasons} baseline={diagnosis.baseline} baselineLabel={diagnosis.baselineLabel} />
      <SeasonTable
        seasons={diagnosis.seasons}
        baseline={diagnosis.baseline}
        baselineLabel={diagnosis.baselineLabel}
        findings={diagnosis.findings}
      />
    </>
  );
}
