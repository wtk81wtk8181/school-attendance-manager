import { neon } from "@neondatabase/serverless";
import { createSeed } from "@/lib/seed";
import {
  mergeSharedState,
  mergeSharedStates,
  sharedFromState,
  needsOperationalDataReset,
} from "@/lib/db-client";
import {
  validateAdminSectionRows,
  type AdminJsonSection,
} from "@/lib/admin-json-patch";
import type { AppState } from "@/lib/types";

const SNAPSHOT_ID = "default";
const REPLACEABLE_ARRAY_SECTIONS = new Set([
  "students",
  "absences",
  "warnings",
  "notifications",
  "digestRecipients",
  "digestLogs",
  "staffMembers",
  "staffDailyAbsences",
  "staffLeaveRecords",
  "studentLeaveRecords",
  "hiddenStudents",
] as const);

export type ReplaceableArraySection =
  (typeof REPLACEABLE_ARRAY_SECTIONS extends Set<infer Key> ? Key : never);

export class RevisionConflictError extends Error {}

function validateReplacementSection(section: ReplaceableArraySection, rows: unknown[]) {
  const error = validateAdminSectionRows(section as AdminJsonSection, rows);
  if (error) throw new Error(error);
}

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

export function formatDatabaseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("data transfer quota") ||
    message.includes("HTTP status 402") ||
    message.includes("exceeded the data transfer")
  ) {
    return "雲端資料庫本月流量配額已用盡，請到 Neon 控制台升級方案或等待下月重置。";
  }
  if (message.includes("Missing DATABASE_URL") || message.includes("POSTGRES_URL")) {
    return "尚未設定 DATABASE_URL／POSTGRES_URL。";
  }
  return "資料庫連線失敗，請稍後再試。";
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

  const rawStaffIds = (raw.staffMembers ?? []).map((item) => item.id).join("|");
  const mergedStaffIds = merged.staffMembers.map((item) => item.id).join("|");
  const rawRemovalIds = (raw.staffRemovals ?? []).map((item) => item.id).join("|");
  const mergedRemovalIds = merged.staffRemovals.map((item) => item.id).join("|");
  if (
    needsOperationalDataReset(raw) ||
    rawStaffIds !== mergedStaffIds ||
    rawRemovalIds !== mergedRemovalIds
  ) {
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
  incoming: Partial<AppState>,
  replaceSections: string[] = [],
  expectedRevision?: number
): Promise<SharedSnapshot> {
  if (!hasDatabase()) {
    throw new Error("Missing DATABASE_URL or POSTGRES_URL");
  }

  await ensureSchema();
  const db = sql();

  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await loadSharedSnapshot();
    const currentRevision = asRevision(current.revision);
    if (
      replaceSections.length > 0 &&
      (!Number.isInteger(expectedRevision) || expectedRevision !== currentRevision)
    ) {
      throw new RevisionConflictError("資料已由其他使用者更新，請重新整理後再修改。");
    }
    const merged = mergeSharedStates(current.state, incoming);
    for (const section of replaceSections) {
      if (!REPLACEABLE_ARRAY_SECTIONS.has(section as ReplaceableArraySection)) continue;
      const replacement = incoming[section as ReplaceableArraySection];
      if (Array.isArray(replacement)) {
        validateReplacementSection(
          section as ReplaceableArraySection,
          replacement
        );
        Object.assign(merged, { [section]: replacement });
      }
    }
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
