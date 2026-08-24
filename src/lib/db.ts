import { neon } from "@neondatabase/serverless";
import { createSeed } from "@/lib/seed";
import {
  mergeSharedState,
  mergeSharedStates,
  sharedFromState,
  needsOperationalDataReset,
} from "@/lib/db-client";
import type { AppState } from "@/lib/types";

const SNAPSHOT_ID = "default";

export interface SharedSnapshot {
  state: AppState;
  revision: number;
  updatedAt: string;
}

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

export { mergeSharedState, mergeSharedStates, sharedFromState };

export async function ensureSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS app_snapshots (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revision BIGINT NOT NULL DEFAULT 0
    )
  `;
  await db`
    ALTER TABLE app_snapshots
    ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0
  `;
}

function asRevision(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUpdatedAt(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export async function loadSharedSnapshot(): Promise<SharedSnapshot> {
  const seed = createSeed();
  if (!hasDatabase()) {
    return { state: seed, revision: 0, updatedAt: new Date().toISOString() };
  }

  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT payload, revision, updated_at
    FROM app_snapshots
    WHERE id = ${SNAPSHOT_ID}
  `;

  if (rows.length === 0) {
    const saved = await saveSharedState(seed);
    return saved;
  }

  const raw = rows[0].payload as Partial<AppState>;
  const merged = mergeSharedState(raw);
  const revision = asRevision(rows[0].revision);
  const updatedAt = formatUpdatedAt(rows[0].updated_at);

  if (needsOperationalDataReset(raw)) {
    return saveSharedState(merged);
  }

  return { state: merged, revision, updatedAt };
}

export async function loadSharedState(): Promise<AppState> {
  const snapshot = await loadSharedSnapshot();
  return snapshot.state;
}

export async function saveSharedState(state: AppState): Promise<SharedSnapshot> {
  if (!hasDatabase()) {
    return { state, revision: 0, updatedAt: new Date().toISOString() };
  }

  await ensureSchema();
  const db = sql();
  const payload = sharedFromState(state);
  const rows = await db`
    INSERT INTO app_snapshots (id, payload, updated_at, revision)
    VALUES (${SNAPSHOT_ID}, ${payload}, now(), 1)
    ON CONFLICT (id) DO UPDATE
    SET payload = EXCLUDED.payload,
        updated_at = now(),
        revision = app_snapshots.revision + 1
    RETURNING revision, updated_at
  `;

  return {
    state,
    revision: asRevision(rows[0].revision ?? 1),
    updatedAt: formatUpdatedAt(rows[0].updated_at),
  };
}

/** 將 client 送出的資料與資料庫現有資料合併後再寫入。 */
export async function saveMergedSharedState(
  incoming: Partial<AppState>
): Promise<SharedSnapshot> {
  if (!hasDatabase()) {
    throw new Error("Missing DATABASE_URL or POSTGRES_URL");
  }

  await ensureSchema();
  const db = sql();

  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await loadSharedSnapshot();
    const currentRevision = asRevision(current.revision);
    const merged = mergeSharedStates(current.state, incoming);
    const payload = sharedFromState(merged);
    const nextRevision = currentRevision + 1;
    const rows = await db`
      UPDATE app_snapshots
      SET payload = ${payload},
          updated_at = now(),
          revision = ${nextRevision}
      WHERE id = ${SNAPSHOT_ID} AND revision = ${currentRevision}
      RETURNING revision, updated_at
    `;

    if (rows.length > 0) {
      return {
        state: merged,
        revision: asRevision(rows[0].revision ?? nextRevision),
        updatedAt: formatUpdatedAt(rows[0].updated_at),
      };
    }
  }

  throw new Error("資料庫同步衝突，請再試一次。");
}
