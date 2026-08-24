import { neon } from "@neondatabase/serverless";
import { createSeed } from "@/lib/seed";
import { mergeSharedState, sharedFromState, needsOperationalDataReset } from "@/lib/db-client";
import type { AppState } from "@/lib/types";

const SNAPSHOT_ID = "default";

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
}

export function hasDatabase() {
  return Boolean(databaseUrl());
}

function sql() {
  const url = databaseUrl();
  if (!url) throw new Error("Missing DATABASE_URL or POSTGRES_URL");
  return neon(url);
}

export { mergeSharedState, sharedFromState };

export async function ensureSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS app_snapshots (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function loadSharedState(): Promise<AppState> {
  const seed = createSeed();
  if (!hasDatabase()) return seed;

  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT payload FROM app_snapshots WHERE id = ${SNAPSHOT_ID}`;
  if (rows.length === 0) {
    await saveSharedState(seed);
    return seed;
  }
  const raw = rows[0].payload as Partial<AppState>;
  const merged = mergeSharedState(raw);
  if (needsOperationalDataReset(raw)) {
    await saveSharedState(merged);
  }
  return merged;
}

export async function saveSharedState(state: AppState) {
  if (!hasDatabase()) return;
  await ensureSchema();
  const db = sql();
  const payload = sharedFromState(state);
  await db`
    INSERT INTO app_snapshots (id, payload, updated_at)
    VALUES (${SNAPSHOT_ID}, ${payload}, now())
    ON CONFLICT (id) DO UPDATE
    SET payload = EXCLUDED.payload, updated_at = now()
  `;
}
