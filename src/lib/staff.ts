import { OFFICIAL_STAFF_ID_PREFIX } from "@/data/staff-members";
import type {
  StaffAbsenceKind,
  StaffDailyAbsence,
  StaffLeaveCategory,
  StaffLeaveRecord,
  StaffMember,
  StaffRemoval,
} from "@/lib/types";

const OFFICIAL_STAFF_REPLACED_AT = "2026-08-25T06:00:00.000Z";
const OFFICIAL_STAFF_ROSTER_MARKER = `${OFFICIAL_STAFF_ID_PREFIX}roster-applied`;

/** 以文件傳閱名單取代舊教職員名單；已在新名單上的刪除會保留。 */
export function applyOfficialStaffRoster(
  current: StaffMember[] | undefined,
  removals: StaffRemoval[] | undefined,
  official: StaffMember[]
): { members: StaffMember[]; extraRemovals: StaffRemoval[] } {
  const list = current ?? [];
  const extraRemovals: StaffRemoval[] = [];
  const removalList = removals ?? [];
  const hasMarker = removalList.some((item) => item.id === OFFICIAL_STAFF_ROSTER_MARKER);
  const hasOfficial = list.some((item) => item.id.startsWith(OFFICIAL_STAFF_ID_PREFIX));
  const rosterApplied = hasMarker || hasOfficial;
  if (!rosterApplied) {
    for (const item of list) {
      extraRemovals.push({ id: item.id, removedAt: OFFICIAL_STAFF_REPLACED_AT });
    }
  }
  if (!hasMarker) {
    extraRemovals.push({
      id: OFFICIAL_STAFF_ROSTER_MARKER,
      removedAt: OFFICIAL_STAFF_REPLACED_AT,
    });
  }

  const removed = new Set(
    [...removalList, ...extraRemovals].map((item) => item.id)
  );
  const members = official.filter((item) => !removed.has(item.id));
  if (rosterApplied) {
    const officialNames = new Set(members.map((item) => item.name));
    for (const item of list) {
      if (item.id.startsWith(OFFICIAL_STAFF_ID_PREFIX)) continue;
      if (removed.has(item.id) || officialNames.has(item.name)) continue;
      members.push(item);
    }
  }
  return { members, extraRemovals };
}

export const STAFF_ABSENCE_ROWS: Array<{
  kind: StaffAbsenceKind;
  label: string;
}> = [
  { kind: "sick", label: "病假" },
  { kind: "personal", label: "事假" },
  { kind: "official", label: "公假" },
  { kind: "early", label: "早退" },
];

export const STAFF_LEAVE_CATEGORIES: Array<{
  value: StaffLeaveCategory;
  label: string;
  kind: StaffAbsenceKind;
}> = [
  { value: "checkup", label: "複診", kind: "sick" },
  { value: "surgery", label: "手術", kind: "sick" },
  { value: "funeral", label: "白事", kind: "personal" },
  { value: "personal", label: "事假", kind: "personal" },
  { value: "official", label: "公假／外出活動／比賽", kind: "official" },
  { value: "sick", label: "病假", kind: "sick" },
  { value: "other", label: "其他", kind: "personal" },
];

export function staffLeaveCategoryLabel(category: StaffLeaveCategory): string {
  return STAFF_LEAVE_CATEGORIES.find((item) => item.value === category)?.label ?? "其他";
}

export function staffLeaveKind(category: StaffLeaveCategory): StaffAbsenceKind {
  return STAFF_LEAVE_CATEGORIES.find((item) => item.value === category)?.kind ?? "personal";
}

export function expandStaffLeaveDates(startDate: string, endDate: string): string[] {
  if (!startDate) return [];
  const end = endDate && endDate >= startDate ? endDate : startDate;
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  let guard = 0;
  while (cursor <= last && guard < 370) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

export function staffLeavesForDate(
  records: StaffLeaveRecord[] | undefined,
  date: string
): StaffLeaveRecord[] {
  return (records ?? []).filter(
    (item) => item.startDate <= date && (item.endDate || item.startDate) >= date
  );
}

export function formatStaffLeaveLine(record: StaffLeaveRecord): string {
  const category = staffLeaveCategoryLabel(record.category);
  const activity = record.activity.trim() ? `（${record.activity.trim()}）` : "";
  const note = record.note.trim() ? `—${record.note.trim()}` : "";
  return `${record.staffName}（${category}${activity}）${note}`;
}

const MULTI_DAY_LEAVE_THRESHOLD = 2;

function addCalendarDays(date: string, days: number): string {
  const cursor = new Date(`${date}T00:00:00`);
  cursor.setDate(cursor.getDate() + days);
  const year = cursor.getFullYear();
  const month = String(cursor.getMonth() + 1).padStart(2, "0");
  const day = String(cursor.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slashDayMonth(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(day)}/${Number(month)}`;
}

function leaveCoversDate(record: StaffLeaveRecord, date: string): boolean {
  return record.startDate <= date && (record.endDate || record.startDate) >= date;
}

function leaveDayCount(record: StaffLeaveRecord): number {
  return expandStaffLeaveDates(record.startDate, record.endDate || record.startDate).length;
}

function matchingStaffLeave(
  records: StaffLeaveRecord[] | undefined,
  staffId: string,
  kind: StaffAbsenceKind,
  date: string
): StaffLeaveRecord | undefined {
  return (records ?? [])
    .filter(
      (item) =>
        item.staffId === staffId &&
        staffLeaveKind(item.category) === kind &&
        leaveCoversDate(item, date)
    )
    .sort((a, b) => leaveDayCount(b) - leaveDayCount(a))[0];
}

function staffKindDateSet(
  staffId: string,
  kind: StaffAbsenceKind,
  leaveRecords: StaffLeaveRecord[] | undefined,
  allDaily: StaffDailyAbsence[] | undefined
): Set<string> {
  const dates = new Set<string>();
  for (const leave of leaveRecords ?? []) {
    if (leave.staffId !== staffId || staffLeaveKind(leave.category) !== kind) continue;
    for (const date of expandStaffLeaveDates(leave.startDate, leave.endDate || leave.startDate)) {
      dates.add(date);
    }
  }
  for (const daily of allDaily ?? []) {
    if (staffIdsForKind(daily, kind).includes(staffId)) {
      dates.add(daily.date);
    }
  }
  return dates;
}

function contiguousLeaveRange(
  dates: Set<string>,
  schoolDay: string
): { start: string; end: string; days: number } | undefined {
  if (!dates.has(schoolDay)) return undefined;
  let start = schoolDay;
  let end = schoolDay;
  while (dates.has(addCalendarDays(start, -1))) {
    start = addCalendarDays(start, -1);
  }
  while (dates.has(addCalendarDays(end, 1))) {
    end = addCalendarDays(end, 1);
  }
  return {
    start,
    end,
    days: expandStaffLeaveDates(start, end).length,
  };
}

function formatStaffDailyReportLabel(
  name: string,
  kind: StaffAbsenceKind,
  staffId: string,
  schoolDay: string,
  leaveRecords: StaffLeaveRecord[] | undefined,
  allDaily: StaffDailyAbsence[] | undefined
): string {
  const leave = matchingStaffLeave(leaveRecords, staffId, kind, schoolDay);
  const range = leave
    ? {
        start: leave.startDate,
        end: leave.endDate || leave.startDate,
        days: leaveDayCount(leave),
      }
    : contiguousLeaveRange(
        staffKindDateSet(staffId, kind, leaveRecords, allDaily),
        schoolDay
      );
  const extras: string[] = [];
  const activity = leave?.activity.trim();
  const note = leave?.note.trim();
  if (activity) extras.push(activity);
  else if (note) extras.push(note);
  const showDates = range && range.days > MULTI_DAY_LEAVE_THRESHOLD;
  if (showDates) {
    extras.push(
      range.end !== range.start
        ? `${slashDayMonth(range.start)}-${slashDayMonth(range.end)}`
        : slashDayMonth(range.start)
    );
  }
  return extras.length > 0 ? `${name}（${extras.join("，")}）` : name;
}

/** 每日報告用：病假／公假／事假如超過兩天，附上請假日子。 */
export function staffDailyReportLabels(
  members: StaffMember[],
  record: StaffDailyAbsence | undefined,
  kind: StaffAbsenceKind,
  schoolDay: string,
  leaveRecords: StaffLeaveRecord[] | undefined,
  allDaily: StaffDailyAbsence[] | undefined
): string[] {
  const ids = new Set(staffIdsForKind(record, kind));
  return members
    .filter((item) => ids.has(item.id))
    .map((item) =>
      formatStaffDailyReportLabel(
        item.name,
        kind,
        item.id,
        schoolDay,
        leaveRecords,
        allDaily
      )
    );
}

/** 將提早登記的請假合併進當日四行勾選。 */
export function applyStaffLeavesToDaily(
  daily: StaffDailyAbsence,
  leaves: StaffLeaveRecord[],
  updatedAt: string
): StaffDailyAbsence {
  let next = daily;
  for (const leave of leaves) {
    const manualSelection = next.selectionChanges?.[leave.staffId];
    if (manualSelection?.updatedAt) continue;
    next = withToggledStaff(next, staffLeaveKind(leave.category), leave.staffId, true, updatedAt);
  }
  return next;
}

const KIND_KEYS: Record<StaffAbsenceKind, keyof Pick<
  StaffDailyAbsence,
  "sickIds" | "personalIds" | "officialIds" | "earlyIds"
>> = {
  sick: "sickIds",
  personal: "personalIds",
  official: "officialIds",
  early: "earlyIds",
};

export function emptyStaffDaily(date: string, updatedAt = ""): StaffDailyAbsence {
  return {
    date,
    sickIds: [],
    personalIds: [],
    officialIds: [],
    earlyIds: [],
    updatedAt,
  };
}

export function staffDailyFor(
  records: StaffDailyAbsence[] | undefined,
  date: string
): StaffDailyAbsence {
  return records?.find((item) => item.date === date) ?? emptyStaffDaily(date);
}

export function staffIdsForKind(
  record: StaffDailyAbsence | undefined,
  kind: StaffAbsenceKind
): string[] {
  if (!record) return [];
  return record[KIND_KEYS[kind]];
}

export function staffNamesForKind(
  members: StaffMember[],
  record: StaffDailyAbsence | undefined,
  kind: StaffAbsenceKind
): string[] {
  const ids = new Set(staffIdsForKind(record, kind));
  return members
    .filter((item) => ids.has(item.id))
    .map((item) => item.name);
}

export function withToggledStaff(
  record: StaffDailyAbsence,
  kind: StaffAbsenceKind,
  staffId: string,
  selected: boolean,
  updatedAt: string
): StaffDailyAbsence {
  const next: StaffDailyAbsence = {
    ...record,
    sickIds: record.sickIds.filter((id) => id !== staffId),
    personalIds: record.personalIds.filter((id) => id !== staffId),
    officialIds: record.officialIds.filter((id) => id !== staffId),
    earlyIds: record.earlyIds.filter((id) => id !== staffId),
    selectionChanges: {
      ...(record.selectionChanges ?? {}),
      [staffId]: { kind: selected ? kind : null, updatedAt },
    },
    updatedAt,
  };
  if (selected) {
    const key = KIND_KEYS[kind];
    next[key] = [...next[key], staffId];
  }
  return next;
}
