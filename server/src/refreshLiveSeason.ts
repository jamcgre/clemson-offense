import { pool } from "./db";
import { ingestSeasons } from "./ingest";
import { liveSeasonYear } from "./seasonClock";

async function main(): Promise<void> {
  const year = liveSeasonYear();
  if (year == null) {
    console.log("No season is in progress. Leaving the database unchanged.");
    return;
  }
  await ingestSeasons([year]);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
