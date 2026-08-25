import type {
  StaffAbsenceKind,
  StaffDailyAbsence,
  StaffLeaveCategory,
  StaffLeaveRecord,
  StaffMember,
} from "@/lib/types";

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

/** 將提早登記的請假合併進當日四行勾選。 */
export function applyStaffLeavesToDaily(
  daily: StaffDailyAbsence,
  leaves: StaffLeaveRecord[],
  updatedAt: string
): StaffDailyAbsence {
  let next = daily;
  for (const leave of leaves) {
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
    updatedAt,
  };
  if (selected) {
    const key = KIND_KEYS[kind];
    next[key] = [...next[key], staffId];
  }
  return next;
}
