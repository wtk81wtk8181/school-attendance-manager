import { createSeed, OPERATIONAL_DATA_VERSION } from "@/lib/seed";
import type {
  AbsenceRecord,
  AppState,
  AttendanceClear,
  AuditLog,
  DigestLog,
  DigestRecipient,
  DigestSettings,
  NotificationItem,
  RecipientRemoval,
  StaffAbsenceKind,
  StaffDailyAbsence,
  StaffLeaveRecord,
  StaffLeaveRemoval,
  StaffMember,
  StaffRemoval,
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
  void _user;
  void _class;
  void _users;
  return shared;
}

function isLegacyMockRoster(students: Student[]) {
  if (students.length < 500) return true;
  if (new Set(students.map((student) => student.id)).size !== students.length) {
    return true;
  }
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
    clearedAttendance: seed.clearedAttendance,
    removedRecipients: seed.removedRecipients,
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
        clearedAttendance: shared.clearedAttendance ?? seed.clearedAttendance,
        removedRecipients: shared.removedRecipients ?? seed.removedRecipients,
      };

  return {
    ...seed,
    ...shared,
    ...operational,
    academicYear: seed.academicYear,
    users: seed.users,
    currentUserId: null,
    selectedClassName: null,
    students: replaceRoster ? seed.students : (shared.students ?? seed.students),
    digestRecipients: shared.digestRecipients ?? seed.digestRecipients,
    staffMembers: shared.staffMembers ?? seed.staffMembers,
    staffRemovals: shared.staffRemovals ?? seed.staffRemovals,
    staffDailyAbsences: shared.staffDailyAbsences ?? seed.staffDailyAbsences,
    staffLeaveRecords: shared.staffLeaveRecords ?? seed.staffLeaveRecords,
    staffLeaveRemovals: shared.staffLeaveRemovals ?? seed.staffLeaveRemovals,
    auditLogs: shared.auditLogs ?? seed.auditLogs,
    dataVersion: OPERATIONAL_DATA_VERSION,
  };
}

export function needsOperationalDataReset(shared: Partial<AppState>) {
  return shouldResetOperationalData(shared);
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

function mergeClears(
  current: AttendanceClear[] | undefined,
  incoming: AttendanceClear[] | undefined
): AttendanceClear[] {
  const map = new Map<string, AttendanceClear>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const key = `${item.studentId}:${item.date}`;
    const existing = map.get(key);
    if (!existing || item.clearedAt >= existing.clearedAt) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function mergeRemovals(
  current: RecipientRemoval[] | undefined,
  incoming: RecipientRemoval[] | undefined
): RecipientRemoval[] {
  const map = new Map<string, RecipientRemoval>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const key = item.email.trim().toLowerCase() || item.id;
    const existing = map.get(key);
    if (!existing || item.removedAt >= existing.removedAt) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function mergeAbsences(
  current: AbsenceRecord[],
  incoming: AbsenceRecord[],
  clears: AttendanceClear[]
): AbsenceRecord[] {
  const map = new Map<string, AbsenceRecord>();
  for (const record of current) map.set(absenceKey(record), record);
  for (const record of incoming) {
    const key = absenceKey(record);
    const existing = map.get(key);
    if (!existing || absenceActivity(record) >= absenceActivity(existing)) {
      map.set(key, record);
    }
  }
  const clearAt = new Map(
    clears.map((item) => [`${item.studentId}:${item.date}`, Date.parse(item.clearedAt)])
  );
  return [...map.values()]
    .filter((record) => {
      const cleared = clearAt.get(absenceKey(record));
      if (cleared === undefined || Number.isNaN(cleared)) return true;
      return absenceActivity(record) > cleared;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.studentId.localeCompare(b.studentId));
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
  incoming: DigestRecipient[],
  removals: RecipientRemoval[]
): DigestRecipient[] {
  let merged = current;
  for (const recipient of incoming) {
    merged = mergeDigestRecipient(merged, recipient);
  }
  return merged.filter((recipient) => {
    const removal = removals.find(
      (item) =>
        item.id === recipient.id ||
        item.email.toLowerCase() === recipient.email.toLowerCase()
    );
    if (!removal) return true;
    const updated = Date.parse(recipient.updatedAt ?? "");
    const removed = Date.parse(removal.removedAt);
    if (Number.isNaN(updated) || Number.isNaN(removed)) return false;
    return updated > removed;
  });
}

function mergeDigestSettings(current: DigestSettings, incoming: DigestSettings): DigestSettings {
  const currentUpdated = Date.parse(current.updatedAt ?? "");
  const incomingUpdated = Date.parse(incoming.updatedAt ?? "");
  const preferIncoming =
    Number.isNaN(currentUpdated) ||
    (!Number.isNaN(incomingUpdated) && incomingUpdated >= currentUpdated);
  const latest = preferIncoming ? incoming : current;
  return {
    enabled: latest.enabled,
    sendTime: latest.sendTime || current.sendTime,
    lastSentOn: pickLaterDate(current.lastSentOn, incoming.lastSentOn),
    lastSentSchoolDay: pickLaterDate(current.lastSentSchoolDay, incoming.lastSentSchoolDay),
    updatedAt: latest.updatedAt ?? current.updatedAt ?? incoming.updatedAt,
  };
}

function mergeStaffRemovals(
  current: StaffRemoval[] | undefined,
  incoming: StaffRemoval[] | undefined
): StaffRemoval[] {
  const map = new Map<string, StaffRemoval>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const existing = map.get(item.id);
    if (!existing || item.removedAt >= existing.removedAt) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

function mergeStaffMembers(
  current: StaffMember[] | undefined,
  incoming: StaffMember[] | undefined,
  removals: StaffRemoval[]
): StaffMember[] {
  const map = new Map<string, StaffMember>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const existing = map.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      map.set(item.id, item);
    }
  }
  return [...map.values()]
    .filter((item) => {
      const removal = removals.find((row) => row.id === item.id);
      if (!removal) return true;
      const updated = Date.parse(item.updatedAt);
      const removed = Date.parse(removal.removedAt);
      if (Number.isNaN(updated) || Number.isNaN(removed)) return false;
      return updated > removed;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-HK"));
}

function mergeStaffDailyAbsences(
  current: StaffDailyAbsence[] | undefined,
  incoming: StaffDailyAbsence[] | undefined
): StaffDailyAbsence[] {
  const map = new Map<
    string,
    {
      updatedAt: string;
      changes: Record<string, { kind: StaffAbsenceKind | null; updatedAt: string }>;
    }
  >();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const existing = map.get(item.date) ?? { updatedAt: "", changes: {} };
    const legacyChanges: Record<
      string,
      { kind: StaffAbsenceKind | null; updatedAt: string }
    > = {};
    const addLegacy = (ids: string[], kind: StaffAbsenceKind) => {
      for (const id of ids) {
        legacyChanges[id] = { kind, updatedAt: item.updatedAt };
      }
    };
    addLegacy(item.sickIds, "sick");
    addLegacy(item.personalIds, "personal");
    addLegacy(item.officialIds, "official");
    addLegacy(item.earlyIds, "early");

    for (const [staffId, change] of Object.entries({
      ...legacyChanges,
      ...(item.selectionChanges ?? {}),
    })) {
      const previous = existing.changes[staffId];
      if (!previous || change.updatedAt >= previous.updatedAt) {
        existing.changes[staffId] = change;
      }
    }
    existing.updatedAt =
      item.updatedAt >= existing.updatedAt ? item.updatedAt : existing.updatedAt;
    map.set(item.date, existing);
  }
  return [...map.entries()]
    .map(([date, value]) => {
      const idsFor = (kind: StaffAbsenceKind) =>
        Object.entries(value.changes)
          .filter(([, change]) => change.kind === kind)
          .map(([staffId]) => staffId);
      return {
        date,
        sickIds: idsFor("sick"),
        personalIds: idsFor("personal"),
        officialIds: idsFor("official"),
        earlyIds: idsFor("early"),
        selectionChanges: value.changes,
        updatedAt: value.updatedAt,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function mergeStaffLeaveRemovals(
  current: StaffLeaveRemoval[] | undefined,
  incoming: StaffLeaveRemoval[] | undefined
): StaffLeaveRemoval[] {
  const map = new Map<string, StaffLeaveRemoval>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const existing = map.get(item.id);
    if (!existing || item.removedAt >= existing.removedAt) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

function mergeStaffLeaveRecords(
  current: StaffLeaveRecord[] | undefined,
  incoming: StaffLeaveRecord[] | undefined,
  removals: StaffLeaveRemoval[]
): StaffLeaveRecord[] {
  const map = new Map<string, StaffLeaveRecord>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    const existing = map.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      map.set(item.id, item);
    }
  }
  return [...map.values()]
    .filter((item) => {
      const removal = removals.find((row) => row.id === item.id);
      if (!removal) return true;
      return item.updatedAt > removal.removedAt;
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

const AUDIT_LOG_LIMIT = 500;

function mergeAuditLogs(
  current: AuditLog[] | undefined,
  incoming: AuditLog[] | undefined
): AuditLog[] {
  const map = new Map<string, AuditLog>();
  for (const item of [...(current ?? []), ...(incoming ?? [])]) {
    map.set(item.id, item);
  }
  return [...map.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, AUDIT_LOG_LIMIT);
}

/** 合併兩份雲端資料，避免多裝置後寫覆蓋先寫的紀錄。 */
export function mergeSharedStates(
  current: AppState,
  incoming: Partial<AppState>
): AppState {
  const seed = createSeed();
  const base = mergeSharedState(current);
  const next = mergeSharedState(incoming);
  const clearedAttendance = mergeClears(base.clearedAttendance, next.clearedAttendance);
  const removedRecipients = mergeRemovals(base.removedRecipients, next.removedRecipients);
  const staffRemovals = mergeStaffRemovals(base.staffRemovals, next.staffRemovals);
  const staffLeaveRemovals = mergeStaffLeaveRemovals(
    base.staffLeaveRemovals,
    next.staffLeaveRemovals
  );

  return {
    ...base,
    academicYear: seed.academicYear,
    students: pickStudents(base.students, next.students, seed.students),
    absences: mergeAbsences(base.absences, next.absences, clearedAttendance),
    warnings: mergeWarnings(base.warnings, next.warnings),
    notifications: mergeNotifications(base.notifications, next.notifications),
    digestLogs: mergeDigestLogs(base.digestLogs, next.digestLogs),
    digestRecipients: mergeAllDigestRecipients(
      base.digestRecipients,
      next.digestRecipients,
      removedRecipients
    ),
    digestSettings: mergeDigestSettings(base.digestSettings, next.digestSettings),
    clearedAttendance,
    removedRecipients,
    staffMembers: mergeStaffMembers(base.staffMembers, next.staffMembers, staffRemovals),
    staffRemovals,
    staffDailyAbsences: mergeStaffDailyAbsences(
      base.staffDailyAbsences,
      next.staffDailyAbsences
    ),
    staffLeaveRecords: mergeStaffLeaveRecords(
      base.staffLeaveRecords,
      next.staffLeaveRecords,
      staffLeaveRemovals
    ),
    staffLeaveRemovals,
    auditLogs: mergeAuditLogs(base.auditLogs, next.auditLogs),
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
  const currentUpdated = Date.parse(recipients[index].updatedAt ?? "");
  const nextUpdated = Date.parse(next.updatedAt ?? "");
  if (
    !Number.isNaN(currentUpdated) &&
    (Number.isNaN(nextUpdated) || nextUpdated < currentUpdated)
  ) {
    return recipients;
  }
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
