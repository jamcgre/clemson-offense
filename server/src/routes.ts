import express from "express";
import { buildGameLog, buildSplits, buildSnapshot, seasonExists } from "./aggregate";
import { explainDatabaseError, queryDataset } from "./queries";
import type { Dataset } from "./types";
import { diagnose } from "./diagnosis";

const CACHE_MS = 15_000;

let cache: { at: number; dataset: Dataset } | null = null;

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/api/seasons", async (_req, res) => {
    try {
      const dataset = await loadDataset();
      const seasons = [...seasonYears(dataset)]
        .sort((a, b) => a - b)
        .map((year) => snapshotFor(dataset, year));
      res.json({ seasons });
    } catch (error) {
      res.status(503).json({ error: explainDatabaseError(error) });
    }
  });

  app.get("/api/seasons/:year/games", async (req, res) => {
    const year = parseYear(req.params.year);
    if (year == null) {
      res.status(400).json({ error: "Year must be a four-digit number." });
      return;
    }
    try {
      const dataset = await loadDataset();
      if (!seasonExists(dataset, year)) {
        res.status(404).json({ error: `No games stored for ${year}.` });
        return;
      }
      const slice = sliceYear(dataset, year);
      res.json({ season: year, games: buildGameLog(slice.games, slice.plays, slice.drives) });
    } catch (error) {
      res.status(503).json({ error: explainDatabaseError(error) });
    }
  });

  app.get("/api/seasons/:year", async (req, res) => {
    const year = parseYear(req.params.year);
    if (year == null) {
      res.status(400).json({ error: "Year must be a four-digit number." });
      return;
    }
    try {
      const dataset = await loadDataset();
      if (!seasonExists(dataset, year)) {
        res.status(404).json({ error: `No stats stored for ${year}.` });
        return;
      }
      const snapshots = [...seasonYears(dataset)]
        .sort((a, b) => a - b)
        .map((item) => snapshotFor(dataset, item));
      const diagnosis = diagnose({ seasons: snapshots });
      const summary = snapshots.find((item) => item.season === year);
      if (!summary) {
        res.status(404).json({ error: `No stats stored for ${year}.` });
        return;
      }
      const slice = sliceYear(dataset, year);
      res.json({
        season: year,
        partial: summary.partial,
        summary,
        baseline: diagnosis.baseline,
        baselineLabel: diagnosis.baselineLabel,
        splits: buildSplits(slice.plays, slice.drives),
      });
    } catch (error) {
      res.status(503).json({ error: explainDatabaseError(error) });
    }
  });

  app.get("/api/diagnosis", async (_req, res) => {
    try {
      const dataset = await loadDataset();
      const seasons = [...seasonYears(dataset)]
        .sort((a, b) => a - b)
        .map((year) => snapshotFor(dataset, year));
      res.json(diagnose({ seasons }));
    } catch (error) {
      res.status(503).json({ error: explainDatabaseError(error) });
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

async function loadDataset(): Promise<Dataset> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.dataset;
  const dataset = await queryDataset();
  cache = { at: Date.now(), dataset };
  return dataset;
}

function seasonYears(dataset: Dataset): Set<number> {
  const years = new Set<number>();
  for (const game of dataset.games) years.add(game.season);
  for (const play of dataset.plays) years.add(play.season);
  for (const drive of dataset.drives) years.add(drive.season);
  for (const row of dataset.seasonPpa) years.add(row.season);
  return years;
}

function sliceYear(dataset: Dataset, year: number) {
  return {
    plays: dataset.plays.filter((play) => play.season === year),
    drives: dataset.drives.filter((drive) => drive.season === year),
    games: dataset.games.filter((game) => game.season === year),
    ppa: dataset.seasonPpa.find((row) => row.season === year),
  };
}

function snapshotFor(dataset: Dataset, year: number) {
  const slice = sliceYear(dataset, year);
  return buildSnapshot(year, slice.plays, slice.drives, slice.games, slice.ppa);
}

function parseYear(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  return Number(value);
}
