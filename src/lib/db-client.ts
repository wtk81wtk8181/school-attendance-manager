import { createSeed, OPERATIONAL_DATA_VERSION } from "@/lib/seed";
import type {
  AbsenceRecord,
  AppState,
  DigestLog,
  DigestRecipient,
  DigestSettings,
  NotificationItem,
  Student,
  WarningLetter,
} from "@/lib/types";

export const SESSION_KEY = "hongtao-attendance-session-v1";

export function sharedFromState(
  state: AppState
): Omit<AppState, "currentUserId" | "selectedClassName" | "users"> {
  const {
    currentUserId: _user,
    selectedClassName: _class,
    users: _users,
    ...shared
  } = state;
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
  const resetOperational = shouldResetOperationalData(shared);
  const operational = resetOperational
    ? emptyOperationalData(seed)
    : {
        absences: shared.absences ?? seed.absences,
        warnings: shared.warnings ?? seed.warnings,
        notifications: shared.notifications ?? seed.notifications,
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

function activityTime(iso: string | undefined, fallback: string): number {
  if (iso) {
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const parsed = Date.parse(fallback);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function absenceKey(record: AbsenceRecord): string {
  return `${record.studentId}:${record.date}`;
}

function absenceActivity(record: AbsenceRecord): number {
  return activityTime(record.reviewedAt ?? record.calledAt, `${record.date}T00:00:00`);
}

function warningActivity(letter: WarningLetter): number {
  return activityTime(letter.followedUpAt ?? letter.issuedAt, letter.issuedAt);
}

function pickLaterDate(current: string, incoming: string): string {
  if (!current) return incoming;
  if (!incoming) return current;
  return incoming >= current ? incoming : current;
}

function pickStudents(current: Student[], incoming: Student[], seed: Student[]): Student[] {
  const seedState = createSeed();
  const currentBad = shouldReplaceRoster(
    { students: current, dataVersion: OPERATIONAL_DATA_VERSION },
    seedState
  );
  const incomingBad = shouldReplaceRoster(
    { students: incoming, dataVersion: OPERATIONAL_DATA_VERSION },
    seedState
  );
  if (currentBad && !incomingBad) return incoming;
  if (!currentBad && incomingBad) return current;
  if (currentBad && incomingBad) return seed;
  return incoming.length >= current.length ? incoming : current;
}

function mergeAbsences(current: AbsenceRecord[], incoming: AbsenceRecord[]): AbsenceRecord[] {
  const map = new Map<string, AbsenceRecord>();
  for (const record of current) map.set(absenceKey(record), record);
  for (const record of incoming) {
    const key = absenceKey(record);
    const existing = map.get(key);
    if (!existing || absenceActivity(record) >= absenceActivity(existing)) {
      map.set(key, record);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.studentId.localeCompare(b.studentId)
  );
}

function mergeWarnings(current: WarningLetter[], incoming: WarningLetter[]): WarningLetter[] {
  const map = new Map<string, WarningLetter>();
  for (const letter of current) map.set(letter.id, letter);
  for (const letter of incoming) {
    const existing = map.get(letter.id);
    if (!existing || warningActivity(letter) >= warningActivity(existing)) {
      map.set(letter.id, letter);
    }
  }
  return [...map.values()].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

function mergeNotifications(
  current: NotificationItem[],
  incoming: NotificationItem[]
): NotificationItem[] {
  const map = new Map<string, NotificationItem>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    const newer =
      activityTime(item.createdAt, item.createdAt) >=
      activityTime(existing.createdAt, existing.createdAt)
        ? item
        : existing;
    map.set(item.id, { ...newer, read: existing.read || item.read });
  }
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeDigestLogs(current: DigestLog[], incoming: DigestLog[]): DigestLog[] {
  const map = new Map<string, DigestLog>();
  for (const log of current) map.set(log.id, log);
  for (const log of incoming) map.set(log.id, log);
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeAllDigestRecipients(
  current: DigestRecipient[],
  incoming: DigestRecipient[]
): DigestRecipient[] {
  let merged = current;
  for (const recipient of incoming) {
    merged = mergeDigestRecipient(merged, recipient);
  }
  return merged;
}

function mergeDigestSettings(current: DigestSettings, incoming: DigestSettings): DigestSettings {
  return {
    enabled: incoming.enabled,
    sendTime: incoming.sendTime || current.sendTime,
    lastSentOn: pickLaterDate(current.lastSentOn, incoming.lastSentOn),
    lastSentSchoolDay: pickLaterDate(current.lastSentSchoolDay, incoming.lastSentSchoolDay),
  };
}

/** 合併兩份雲端資料，避免多裝置後寫覆蓋先寫的紀錄。 */
export function mergeSharedStates(
  current: AppState,
  incoming: Partial<AppState>
): AppState {
  const seed = createSeed();
  const base = mergeSharedState(current);
  const next = mergeSharedState(incoming);

  return {
    ...base,
    academicYear: next.academicYear,
    students: pickStudents(base.students, next.students, seed.students),
    absences: mergeAbsences(base.absences, next.absences),
    warnings: mergeWarnings(base.warnings, next.warnings),
    notifications: mergeNotifications(base.notifications, next.notifications),
    digestLogs: mergeDigestLogs(base.digestLogs, next.digestLogs),
    digestRecipients: mergeAllDigestRecipients(base.digestRecipients, next.digestRecipients),
    digestSettings: mergeDigestSettings(base.digestSettings, next.digestSettings),
    dataVersion: OPERATIONAL_DATA_VERSION,
    users: seed.users,
    currentUserId: null,
    selectedClassName: null,
  };
}

export function normalizeDigestRecipient(recipient: DigestRecipient): DigestRecipient {
  const email = recipient.email.trim();
  const normalized = email.toLowerCase();
  return {
    ...recipient,
    email,
    name: recipient.name.trim() || email.split("@")[0] || email,
    title: recipient.title.trim() || "收件人",
    id: `rcpt-${normalized.replace(/[^a-z0-9]+/g, "-")}`,
  };
}

export function mergeDigestRecipient(
  recipients: DigestRecipient[],
  incoming: DigestRecipient
): DigestRecipient[] {
  const next = normalizeDigestRecipient(incoming);
  const index = recipients.findIndex(
    (item) => item.email.toLowerCase() === next.email.toLowerCase()
  );
  if (index === -1) return [...recipients, next];
  const merged = [...recipients];
  merged[index] = { ...merged[index], ...next, id: next.id };
  return merged;
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
