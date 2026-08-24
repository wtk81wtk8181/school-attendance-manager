import { createSeed, OPERATIONAL_DATA_VERSION } from "@/lib/seed";
import type { AppState, Student } from "@/lib/types";

export const SESSION_KEY = "hongtao-attendance-session-v1";

export function sharedFromState(
  state: AppState
): Omit<AppState, "currentUserId" | "selectedClassName" | "users"> {
  const { currentUserId: _user, selectedClassName: _class, users: _users, ...shared } =
    state;
  return shared;
}

function isLegacyMockRoster(students: Student[]) {
  if (students.length < 500) return true;
  return students.some((student) => /^s[1-6][a-e]\d{2}$/i.test(student.id));
}

function shouldReplaceRoster(shared: Partial<AppState>, seed: AppState) {
  const students = shared.students ?? [];
  if (students.length === 0) return true;
  if ((shared.dataVersion ?? 1) < OPERATIONAL_DATA_VERSION) return true;
  if (isLegacyMockRoster(students)) return true;
  if (students.length < seed.students.length) return true;
  return false;
}

function shouldResetOperationalData(shared: Partial<AppState>) {
  return (shared.dataVersion ?? 1) < OPERATIONAL_DATA_VERSION;
}

function emptyOperationalData(seed: AppState) {
  return {
    absences: seed.absences,
    warnings: seed.warnings,
    notifications: seed.notifications,
    syncLogs: seed.syncLogs,
    digestLogs: seed.digestLogs,
    digestSettings: {
      ...seed.digestSettings,
      lastSentOn: "",
      lastSentSchoolDay: "",
    },
  };
}

export function mergeSharedState(shared: Partial<AppState>): AppState {
  const seed = createSeed();
  const replaceRoster = shouldReplaceRoster(shared, seed);
  const resetOperational = shouldResetOperationalData(shared) || replaceRoster;
  const operational = resetOperational
    ? emptyOperationalData(seed)
    : {
        absences: shared.absences ?? seed.absences,
        warnings: shared.warnings ?? seed.warnings,
        notifications: shared.notifications ?? seed.notifications,
        syncLogs: shared.syncLogs ?? seed.syncLogs,
        digestLogs: shared.digestLogs ?? seed.digestLogs,
        digestSettings: shared.digestSettings ?? seed.digestSettings,
      };

  return {
    ...seed,
    ...shared,
    ...operational,
    users: seed.users,
    currentUserId: null,
    selectedClassName: null,
    students: replaceRoster ? seed.students : (shared.students ?? seed.students),
    digestRecipients: shared.digestRecipients ?? seed.digestRecipients,
    dataVersion: OPERATIONAL_DATA_VERSION,
  };
}

export function needsOperationalDataReset(shared: Partial<AppState>) {
  const seed = createSeed();
  return shouldResetOperationalData(shared) || shouldReplaceRoster(shared, seed);
}

export function readSession(): Pick<AppState, "currentUserId" | "selectedClassName"> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { currentUserId: null, selectedClassName: null };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      currentUserId: parsed.currentUserId ?? null,
      selectedClassName: parsed.selectedClassName ?? null,
    };
  } catch {
    return { currentUserId: null, selectedClassName: null };
  }
}

export function writeSession(state: AppState) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      currentUserId: state.currentUserId,
      selectedClassName: state.selectedClassName,
    })
  );
}
