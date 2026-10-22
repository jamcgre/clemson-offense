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

  return (
    <>
      <p className="kicker">2008–2026</p>
      <h1>Clemson offense</h1>

      <TrendChart seasons={diagnosis.seasons} baseline={diagnosis.baseline} baselineLabel={diagnosis.baselineLabel} />
      <SeasonTable seasons={diagnosis.seasons} baseline={diagnosis.baseline} baselineLabel={diagnosis.baselineLabel} />
    </>
  );
}
