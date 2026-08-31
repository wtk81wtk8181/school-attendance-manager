import { sharedFromState } from "@/lib/db-client";
import type { AppState } from "@/lib/types";

export const SNAPSHOT_ROSTER_ID = "roster";
export const SNAPSHOT_OPERATIONAL_ID = "operational";
export const SNAPSHOT_LEGACY_ID = "default";

export const ROSTER_STATE_KEYS = [
  "students",
  "hiddenStudents",
  "hiddenStudentRemovals",
  "staffMembers",
  "staffRemovals",
  "academicYear",
  "digestRecipients",
  "removedRecipients",
  "dataVersion",
] as const satisfies readonly (keyof AppState)[];

export const OPERATIONAL_STATE_KEYS = [
  "absences",
  "warnings",
  "notifications",
  "digestSettings",
  "digestLogs",
  "clearedAttendance",
  "staffDailyAbsences",
  "staffLeaveRecords",
  "staffLeaveRemovals",
  "studentLeaveRecords",
  "studentLeaveRemovals",
  "appearanceIssues",
  "appearanceIssueRemovals",
  "adminMemo",
  "auditLogs",
] as const satisfies readonly (keyof AppState)[];

export const ALL_SHARED_STATE_KEYS = [
  ...ROSTER_STATE_KEYS,
  ...OPERATIONAL_STATE_KEYS,
] as const;

export type SharedStateKey = (typeof ALL_SHARED_STATE_KEYS)[number];
export type SnapshotScope = "roster" | "operational";

const rosterKeySet = new Set<string>(ROSTER_STATE_KEYS);
const operationalKeySet = new Set<string>(OPERATIONAL_STATE_KEYS);
const sharedKeySet = new Set<string>(ALL_SHARED_STATE_KEYS);

export function isSharedStateKey(key: string): key is SharedStateKey {
  return sharedKeySet.has(key);
}

export function snapshotScopeForSection(section: string): SnapshotScope | null {
  if (rosterKeySet.has(section)) return SNAPSHOT_ROSTER_ID;
  if (operationalKeySet.has(section)) return SNAPSHOT_OPERATIONAL_ID;
  return null;
}

export function snapshotScopesForSections(sections: Iterable<string>): Set<SnapshotScope> {
  const scopes = new Set<SnapshotScope>();
  for (const section of sections) {
    const scope = snapshotScopeForSection(section);
    if (scope) scopes.add(scope);
  }
  return scopes;
}

export function pickSharedSections(
  state: AppState,
  sections: Iterable<string>
): Partial<AppState> {
  const shared = sharedFromState(state);
  const picked: Partial<AppState> = {};
  for (const section of sections) {
    if (!isSharedStateKey(section)) continue;
    picked[section] = shared[section] as never;
  }
  return picked;
}

export function pickSharedSectionsByScope(
  state: AppState,
  scope: SnapshotScope
): Partial<AppState> {
  const keys = scope === SNAPSHOT_ROSTER_ID ? ROSTER_STATE_KEYS : OPERATIONAL_STATE_KEYS;
  return pickSharedSections(state, keys);
}

export function detectChangedSharedSections(prev: AppState, next: AppState): SharedStateKey[] {
  const prevShared = sharedFromState(prev);
  const nextShared = sharedFromState(next);
  const changed: SharedStateKey[] = [];
  for (const key of ALL_SHARED_STATE_KEYS) {
    if (prevShared[key] !== nextShared[key]) {
      changed.push(key);
    }
  }
  return changed;
}

export function combinedRevision(rosterRevision: number, operationalRevision: number): number {
  return Math.max(rosterRevision, operationalRevision);
}
