import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(serverRoot, ".env");
dotenv.config({ path: envPath });

const { Pool } = pg;

const defaultDatabaseUrl = "postgres://clemson:clemson@127.0.0.1:5433/clemson_offense";
const connectionString = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const localDatabase = /@(127\.0\.0\.1|localhost)(:|\/)/.test(connectionString);

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 3000,
  max: Number(process.env.PG_POOL_MAX ?? (process.env.NODE_ENV === "production" ? 5 : 1)),
  ssl: localDatabase ? undefined : { rejectUnauthorized: false },
});

pool.on("error", (error) => {
  console.error("Postgres client error:", error.message);
});

const schemaSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(schemaSql)
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

export function friendlyDatabaseMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "EADDRINUSE" || message.includes("EADDRINUSE")) {
    return "The database port is busy. Wait a minute and refresh the page.";
  }
  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    message.includes("ECONNREFUSED") ||
    message.includes("timeout") ||
    message.includes("connect E")
  ) {
    return process.env.NODE_ENV === "production"
      ? "The database could not be reached."
      : "Postgres is not running. Start it with docker compose up -d from the project root.";
  }
  if (
    code === "28P01" ||
    code === "3D000" ||
    message.includes("password authentication") ||
    message.includes("does not exist")
  ) {
    return "Could not open the clemson_offense database. Check DATABASE_URL in server/.env.";
  }
  return "Could not read the database.";
}
