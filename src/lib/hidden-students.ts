import type {
  AbsenceRecord,
  AttendanceClear,
  HiddenStudent,
  HiddenStudentRemoval,
  Student,
} from "@/lib/types";

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

function isFullDayAbsence(status: AbsenceRecord["eclassStatus"]): boolean {
  return status === "absent" || status === "leave";
}

export function consecutiveAbsentDates(
  absences: AbsenceRecord[],
  studentId: string
): string[] {
  return [
    ...new Set(
      absences
        .filter(
          (item) =>
            item.studentId === studentId &&
            isFullDayAbsence(item.eclassStatus) &&
            isWeekday(item.date)
        )
        .map((item) => item.date)
    ),
  ].sort();
}

export function consecutiveAbsentStreak(
  absences: AbsenceRecord[],
  studentId: string,
  asOfDate?: string,
  notBeforeDate?: string
): number {
  const dates = consecutiveAbsentDates(absences, studentId);
  if (dates.length === 0) return 0;

  const dateSet = new Set(dates);
  let cursor = asOfDate ?? dates[dates.length - 1];
  if (!isWeekday(cursor)) cursor = previousSchoolDate(cursor);
  if (notBeforeDate && cursor < notBeforeDate) return 0;
  if (!dateSet.has(cursor)) return 0;

  let length = 0;
  while (dateSet.has(cursor) && (!notBeforeDate || cursor >= notBeforeDate)) {
    length += 1;
    cursor = previousSchoolDate(cursor);
  }
  return length;
}

export function lastAbsentWeekday(
  absences: AbsenceRecord[],
  studentId: string
): string {
  return consecutiveAbsentDates(absences, studentId).at(-1) ?? "";
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

/** 班內總人數：連續七日缺席（Form A）學生不計入，但名單仍顯示。 */
export function headcountRosterStudents(
  students: Student[],
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): Student[] {
  return visibleRosterStudents(students, hiddenStudents, removals);
}

export function carriedFormAAbsences(
  absences: AbsenceRecord[],
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined,
  clearedAttendance: AttendanceClear[] | undefined,
  throughDate: string
): AbsenceRecord[] {
  const hidden = formAHiddenStudents(hiddenStudents, removals);
  if (hidden.length === 0 || !throughDate) return [];

  const existing = new Set(absences.map((item) => `${item.studentId}|${item.date}`));
  const cleared = new Set(
    (clearedAttendance ?? []).map((item) => `${item.studentId}|${item.date}`)
  );
  const carried: AbsenceRecord[] = [];

  for (const student of hidden) {
    if (!student.lastAbsentDate) continue;
    let cursor = nextSchoolDate(student.lastAbsentDate);
    let guard = 0;
    while (cursor <= throughDate && guard < 400) {
      guard += 1;
      const key = `${student.studentId}|${cursor}`;
      if (!existing.has(key) && !cleared.has(key)) {
        carried.push({
          id: `forma-carry-${student.studentId}-${cursor}`,
          studentId: student.studentId,
          date: cursor,
          days: 1,
          eclassStatus: "absent",
          reason: "連續缺席（Form A）",
          documentType: "none",
          documentSubmitted: false,
          reviewStatus: "pending",
          notes: "系統按連續七日缺席自動續計",
          source: "office",
        });
      }
      cursor = nextSchoolDate(cursor);
    }
  }

  return carried;
}

export function absencesIncludingFormACarry(
  absences: AbsenceRecord[],
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined,
  clearedAttendance: AttendanceClear[] | undefined,
  throughDate: string
): AbsenceRecord[] {
  const carried = carriedFormAAbsences(
    absences,
    hiddenStudents,
    removals,
    clearedAttendance,
    throughDate
  );
  return carried.length === 0 ? absences : [...absences, ...carried];
}

/** 警告信仍須顯示已隱藏（Form A）學生，只按角色／班別篩選 */
export function studentsForWarningLetters(
  students: Student[],
  currentUser: { role: string } | null,
  selectedClassName: string | null
): Student[] {
  if (!currentUser) return [];
  if (currentUser.role === "office") return students;
  return students.filter((student) => student.className === selectedClassName);
}

export function formAHiddenStudents(
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): HiddenStudent[] {
  return (hiddenStudents ?? []).filter((item) =>
    isStudentHidden(hiddenStudents, removals, item.studentId)
  );
}

export function formACases(
  students: Student[],
  absences: AbsenceRecord[],
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): HiddenStudent[] {
  const byId = new Map<string, HiddenStudent>();

  for (const hidden of formAHiddenStudents(hiddenStudents, removals)) {
    const streak = consecutiveAbsentStreak(absences, hidden.studentId);
    byId.set(hidden.studentId, {
      ...hidden,
      streak: Math.max(hidden.streak, streak),
      lastAbsentDate:
        lastAbsentWeekday(absences, hidden.studentId) || hidden.lastAbsentDate,
    });
  }

  for (const student of students) {
    if (byId.has(student.id)) continue;
    const removal = (removals ?? []).find((item) => item.id === student.id);
    const streak = consecutiveAbsentStreak(
      absences,
      student.id,
      undefined,
      removal?.removedAt.slice(0, 10)
    );
    if (streak < CONSECUTIVE_ABSENT_LIMIT) continue;
    byId.set(student.id, {
      id: student.id,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      hiddenAt: "",
      lastAbsentDate: lastAbsentWeekday(absences, student.id),
      streak,
    });
  }

  return [...byId.values()].sort(
    (a, b) =>
      a.className.localeCompare(b.className) || a.studentName.localeCompare(b.studentName)
  );
}

export function syncFormAHiddenStudents(
  students: Student[],
  absences: AbsenceRecord[],
  hiddenStudents: HiddenStudent[] | undefined,
  removals: HiddenStudentRemoval[] | undefined
): HiddenStudent[] {
  const current = hiddenStudents ?? [];
  const extra = formACases(students, absences, current, removals).filter(
    (item) => !isStudentHidden(current, removals, item.studentId)
  );
  if (extra.length === 0) return current;
  return [...extra, ...current.filter((item) => !extra.some((row) => row.studentId === item.studentId))];
}

export function formAHiddenStudentsChanged(
  before: HiddenStudent[] | undefined,
  after: HiddenStudent[] | undefined
): boolean {
  const a = (before ?? []).map((item) => item.studentId).sort().join("|");
  const b = (after ?? []).map((item) => item.studentId).sort().join("|");
  return a !== b;
}
