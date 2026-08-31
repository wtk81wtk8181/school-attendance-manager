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
import {
  SNAPSHOT_LEGACY_ID,
  SNAPSHOT_OPERATIONAL_ID,
  SNAPSHOT_ROSTER_ID,
  combinedRevision,
  isSharedStateKey,
  pickSharedSectionsByScope,
  snapshotScopeForSection,
  snapshotScopesForSections,
  type SnapshotScope,
} from "@/lib/shared-state-sections";
import type { AppState } from "@/lib/types";

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
  rosterRevision: number;
  operationalRevision: number;
  updatedAt: string;
}

interface SnapshotRow {
  payload: Partial<AppState>;
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

function snapshotIdForScope(scope: SnapshotScope): string {
  return scope;
}

async function readSnapshotRow(id: string): Promise<SnapshotRow | null> {
  const db = sql();
  const rows = await db`
    SELECT payload, revision, updated_at
    FROM app_snapshots
    WHERE id = ${id}
  `;
  if (rows.length === 0) return null;
  return {
    payload: rows[0].payload as Partial<AppState>,
    revision: asRevision(rows[0].revision),
    updatedAt: formatUpdatedAt(rows[0].updated_at),
  };
}

async function writeSnapshotRow(
  id: string,
  payload: Partial<AppState>,
  expectedRevision?: number
): Promise<SnapshotRow | null> {
  const db = sql();
  const nextRevision = (expectedRevision ?? 0) + 1;
  if (expectedRevision === undefined) {
    const rows = await db`
      INSERT INTO app_snapshots (id, payload, updated_at, revision)
      VALUES (${id}, ${payload}, now(), 1)
      ON CONFLICT (id) DO UPDATE
      SET payload = EXCLUDED.payload,
          updated_at = now(),
          revision = app_snapshots.revision + 1
      RETURNING payload, revision, updated_at
    `;
    return {
      payload: rows[0].payload as Partial<AppState>,
      revision: asRevision(rows[0].revision),
      updatedAt: formatUpdatedAt(rows[0].updated_at),
    };
  }

  const rows = await db`
    UPDATE app_snapshots
    SET payload = ${payload},
        updated_at = now(),
        revision = ${nextRevision}
    WHERE id = ${id} AND revision = ${expectedRevision}
    RETURNING payload, revision, updated_at
  `;
  if (rows.length === 0) return null;
  return {
    payload: rows[0].payload as Partial<AppState>,
    revision: asRevision(rows[0].revision),
    updatedAt: formatUpdatedAt(rows[0].updated_at),
  };
}

async function migrateLegacySnapshotIfNeeded(
  legacy: SnapshotRow | null,
  roster: SnapshotRow | null,
  operational: SnapshotRow | null
): Promise<{ roster: SnapshotRow | null; operational: SnapshotRow | null }> {
  if (!legacy || (roster && operational)) {
    return { roster, operational };
  }

  const merged = mergeSharedState(legacy.payload);
  const rosterPayload = pickSharedSectionsByScope(merged, SNAPSHOT_ROSTER_ID);
  const operationalPayload = pickSharedSectionsByScope(merged, SNAPSHOT_OPERATIONAL_ID);
  const rosterRow =
    roster ??
    (await writeSnapshotRow(SNAPSHOT_ROSTER_ID, rosterPayload, undefined)) ??
    ({
      payload: rosterPayload,
      revision: legacy.revision,
      updatedAt: legacy.updatedAt,
    } satisfies SnapshotRow);
  const operationalRow =
    operational ??
    (await writeSnapshotRow(SNAPSHOT_OPERATIONAL_ID, operationalPayload, undefined)) ??
    ({
      payload: operationalPayload,
      revision: legacy.revision,
      updatedAt: legacy.updatedAt,
    } satisfies SnapshotRow);
  return { roster: rosterRow, operational: operationalRow };
}

function buildSnapshotFromRows(
  roster: SnapshotRow | null,
  operational: SnapshotRow | null
): SharedSnapshot {
  const merged = mergeSharedState({
    ...(roster?.payload ?? {}),
    ...(operational?.payload ?? {}),
  });
  const rosterRevision = roster?.revision ?? 0;
  const operationalRevision = operational?.revision ?? 0;
  const updatedAt = [roster?.updatedAt, operational?.updatedAt]
    .filter(Boolean)
    .sort()
    .at(-1) ?? new Date().toISOString();
  return {
    state: merged,
    revision: combinedRevision(rosterRevision, operationalRevision),
    rosterRevision,
    operationalRevision,
    updatedAt,
  };
}

function pickSnapshotScopes(
  scopes: SnapshotScope[] | undefined,
  rosterRevision: number,
  operationalRevision: number,
  rosterDirty: boolean
): Set<SnapshotScope> {
  if (!scopes || scopes.length === 0) {
    return new Set<SnapshotScope>([SNAPSHOT_ROSTER_ID, SNAPSHOT_OPERATIONAL_ID]);
  }
  const wanted = new Set(scopes);
  if (
    wanted.has(SNAPSHOT_OPERATIONAL_ID) &&
    !wanted.has(SNAPSHOT_ROSTER_ID) &&
    rosterDirty
  ) {
    wanted.add(SNAPSHOT_ROSTER_ID);
  }
  void rosterRevision;
  void operationalRevision;
  return wanted;
}

export async function loadSharedSnapshot(options?: {
  scopes?: SnapshotScope[];
  rosterDirty?: boolean;
}): Promise<SharedSnapshot> {
  const seed = createSeed();
  if (!hasDatabase()) {
    return {
      state: seed,
      revision: 0,
      rosterRevision: 0,
      operationalRevision: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  await ensureSchema();
  let roster = await readSnapshotRow(SNAPSHOT_ROSTER_ID);
  let operational = await readSnapshotRow(SNAPSHOT_OPERATIONAL_ID);
  const legacy = await readSnapshotRow(SNAPSHOT_LEGACY_ID);

  if (!roster && !operational && !legacy) {
    return saveSharedState(seed);
  }

  const migrated = await migrateLegacySnapshotIfNeeded(legacy, roster, operational);
  roster = migrated.roster;
  operational = migrated.operational;

  const full = buildSnapshotFromRows(roster, operational);
  const raw = {
    ...(roster?.payload ?? {}),
    ...(operational?.payload ?? {}),
  };
  const merged = full.state;
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

  const wantedScopes = pickSnapshotScopes(
    options?.scopes,
    full.rosterRevision,
    full.operationalRevision,
    Boolean(options?.rosterDirty)
  );
  if (wantedScopes.size === 2) return full;

  const partial: Partial<AppState> = {};
  if (wantedScopes.has(SNAPSHOT_ROSTER_ID) && roster) {
    Object.assign(partial, roster.payload);
  }
  if (wantedScopes.has(SNAPSHOT_OPERATIONAL_ID) && operational) {
    Object.assign(partial, operational.payload);
  }

  return {
    ...full,
    state: partial as AppState,
  };
}

export async function loadSharedState(): Promise<AppState> {
  const snapshot = await loadSharedSnapshot();
  return snapshot.state;
}

export async function saveSharedState(state: AppState): Promise<SharedSnapshot> {
  if (!hasDatabase()) {
    return {
      state,
      revision: 0,
      rosterRevision: 0,
      operationalRevision: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  await ensureSchema();
  const rosterPayload = pickSharedSectionsByScope(state, SNAPSHOT_ROSTER_ID);
  const operationalPayload = pickSharedSectionsByScope(state, SNAPSHOT_OPERATIONAL_ID);
  const roster = await writeSnapshotRow(SNAPSHOT_ROSTER_ID, rosterPayload);
  const operational = await writeSnapshotRow(SNAPSHOT_OPERATIONAL_ID, operationalPayload);
  return buildSnapshotFromRows(roster, operational);
}

function incomingSharedKeys(
  incoming: Partial<AppState>,
  replaceSections: string[]
): string[] {
  const keys = new Set<string>();
  for (const key of Object.keys(incoming)) {
    if (isSharedStateKey(key)) keys.add(key);
  }
  for (const section of replaceSections) {
    if (isSharedStateKey(section)) keys.add(section);
  }
  return [...keys];
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

    const touchedKeys = incomingSharedKeys(incoming, replaceSections);
    const scopesToWrite = snapshotScopesForSections(touchedKeys);
    if (scopesToWrite.size === 0) {
      return current;
    }

    let roster = await readSnapshotRow(SNAPSHOT_ROSTER_ID);
    let operational = await readSnapshotRow(SNAPSHOT_OPERATIONAL_ID);
    const legacy = await readSnapshotRow(SNAPSHOT_LEGACY_ID);
    const migrated = await migrateLegacySnapshotIfNeeded(legacy, roster, operational);
    roster = migrated.roster;
    operational = migrated.operational;

    let wrote = false;
    if (scopesToWrite.has(SNAPSHOT_ROSTER_ID)) {
      const next = await writeSnapshotRow(
        snapshotIdForScope(SNAPSHOT_ROSTER_ID),
        pickSharedSectionsByScope(merged, SNAPSHOT_ROSTER_ID),
        roster?.revision
      );
      if (!next) continue;
      roster = next;
      wrote = true;
    }
    if (scopesToWrite.has(SNAPSHOT_OPERATIONAL_ID)) {
      const next = await writeSnapshotRow(
        snapshotIdForScope(SNAPSHOT_OPERATIONAL_ID),
        pickSharedSectionsByScope(merged, SNAPSHOT_OPERATIONAL_ID),
        operational?.revision
      );
      if (!next) continue;
      operational = next;
      wrote = true;
    }

    if (!wrote) {
      throw new Error("資料庫同步衝突，請再試一次。");
    }

    return buildSnapshotFromRows(roster, operational);
  }

  throw new Error("資料庫同步衝突，請再試一次。");
}
