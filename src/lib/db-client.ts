import { createSeed } from "@/lib/seed";
import type { AppState } from "@/lib/types";

export const SESSION_KEY = "hongtao-attendance-session-v1";

export function sharedFromState(
  state: AppState
): Omit<AppState, "currentUserId" | "selectedClassName" | "users"> {
  const { currentUserId: _user, selectedClassName: _class, users: _users, ...shared } =
    state;
  return shared;
}

export function mergeSharedState(shared: Partial<AppState>): AppState {
  const seed = createSeed();
  const office = seed.users.find((user) => user.id === "u-office");
  const digestRecipients = (shared.digestRecipients ?? seed.digestRecipients).map(
    (item) =>
      item.id === "rcpt-office" && office
        ? { ...item, name: office.name, title: office.title }
        : item
  );
  return {
    ...seed,
    ...shared,
    users: seed.users,
    currentUserId: null,
    selectedClassName: null,
    students: shared.students ?? seed.students,
    absences: shared.absences ?? seed.absences,
    warnings: shared.warnings ?? seed.warnings,
    notifications: shared.notifications ?? seed.notifications,
    syncLogs: shared.syncLogs ?? seed.syncLogs,
    digestSettings: shared.digestSettings ?? seed.digestSettings,
    digestRecipients,
    digestLogs: shared.digestLogs ?? seed.digestLogs,
  };
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
