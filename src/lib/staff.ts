import type { StaffAbsenceKind, StaffDailyAbsence, StaffMember } from "@/lib/types";

export const STAFF_ABSENCE_ROWS: Array<{
  kind: StaffAbsenceKind;
  label: string;
}> = [
  { kind: "sick", label: "病假" },
  { kind: "personal", label: "事假" },
  { kind: "official", label: "公假" },
  { kind: "early", label: "早退" },
];

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
