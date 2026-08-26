import type { AbsenceRecord, HiddenStudent, HiddenStudentRemoval, Student } from "@/lib/types";

export const CONSECUTIVE_ABSENT_LIMIT = 7;

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function weekdayUtc(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 下一個上課日：平日隔一天；星期五之後是星期一。 */
export function nextSchoolDate(isoDate: string): string {
  return weekdayUtc(isoDate) === 5 ? addUtcDays(isoDate, 3) : addUtcDays(isoDate, 1);
}

/** 上一個上課日：平日前一天；星期一之前是星期五。 */
export function previousSchoolDate(isoDate: string): string {
  const weekday = weekdayUtc(isoDate);
  if (weekday === 1) return addUtcDays(isoDate, -3);
  if (weekday === 0) return addUtcDays(isoDate, -2);
  return addUtcDays(isoDate, -1);
}

function isWeekday(isoDate: string): boolean {
  const weekday = weekdayUtc(isoDate);
  return weekday >= 1 && weekday <= 5;
}

export function consecutiveAbsentStreak(
  absences: AbsenceRecord[],
  studentId: string
): number {
  const dates = [
    ...new Set(
      absences
        .filter(
          (item) =>
            item.studentId === studentId &&
            item.eclassStatus === "absent" &&
            isWeekday(item.date)
        )
        .map((item) => item.date)
    ),
  ].sort();
  if (dates.length === 0) return 0;

  const dateSet = new Set(dates);
  let longest = 1;

  for (const start of dates) {
    let length = 1;
    let cursor = start;
    while (dateSet.has(nextSchoolDate(cursor))) {
      cursor = nextSchoolDate(cursor);
      length += 1;
    }
    if (length > longest) longest = length;
  }

  return longest;
}

export function hasConsecutiveAbsences(
  absences: AbsenceRecord[],
  studentId: string,
  days = CONSECUTIVE_ABSENT_LIMIT
): boolean {
  return consecutiveAbsentStreak(absences, studentId) >= days;
}

export function isStudentHidden(
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined,
  studentId: string
): boolean {
  const hidden = (hiddenStudents ?? []).find((item) => item.studentId === studentId);
  if (!hidden) return false;
  const removal = (removals ?? []).find((item) => item.id === studentId);
  if (!removal) return true;
  return hidden.hiddenAt > removal.removedAt;
}

export function hiddenStudentIdSet(
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): Set<string> {
  return new Set(
    (hiddenStudents ?? [])
      .filter((item) => isStudentHidden(hiddenStudents, removals, item.studentId))
      .map((item) => item.studentId)
  );
}

export function visibleRosterStudents(
  students: Student[],
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): Student[] {
  const hiddenIds = hiddenStudentIdSet(hiddenStudents, removals);
  return students.filter((student) => !hiddenIds.has(student.id));
}

export function formAHiddenStudents(
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): HiddenStudent[] {
  return (hiddenStudents ?? []).filter((item) =>
    isStudentHidden(hiddenStudents, removals, item.studentId)
  );
}
