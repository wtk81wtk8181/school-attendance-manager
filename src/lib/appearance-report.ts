import { allClassNames } from "@/lib/roster";
import { buildMonthlyReport, monthRange } from "@/lib/monthly-report";
import type {
  AbsenceRecord,
  AppearanceIssue,
  AppearanceIssueRemoval,
  Student,
} from "@/lib/types";

export interface AppearanceClassRow {
  className: string;
  studentCount: number;
  issueCount: number;
  punctualityRate: number;
  attendanceRate: number;
  appearanceRate: number;
}

export interface AppearanceReportPayload {
  yearMonth: string;
  academicYear: string;
  monthNumber: number;
  monthLabel: string;
  classes: AppearanceClassRow[];
  totals: {
    studentCount: number;
    issueCount: number;
    punctualityRate: number;
    attendanceRate: number;
    appearanceRate: number;
  };
}

export function appearanceIssueId(date: string, studentId: string) {
  return `appear-${date}-${studentId}`;
}

function legacyAppearanceIssueId(yearMonth: string, studentId: string) {
  return `appear-${yearMonth}-${studentId}`;
}

function isActiveAppearanceIssue(
  record: AppearanceIssue,
  removals: AppearanceIssueRemoval[] | undefined
): boolean {
  const removal = (removals ?? []).find((item) => item.id === record.id);
  if (!removal) return true;
  return record.updatedAt > removal.removedAt;
}

export function hasAppearanceIssueOnDate(
  issues: AppearanceIssue[] | undefined,
  removals: AppearanceIssueRemoval[] | undefined,
  studentId: string,
  date: string
): boolean {
  const id = appearanceIssueId(date, studentId);
  const record = (issues ?? []).find(
    (item) => item.id === id || (item.studentId === studentId && item.date === date)
  );
  if (!record) return false;
  return isActiveAppearanceIssue(record, removals);
}

/** 該月內任一日被標記為有問題，或仍保留舊版每月標記 */
export function hasAppearanceIssueInMonth(
  issues: AppearanceIssue[] | undefined,
  removals: AppearanceIssueRemoval[] | undefined,
  studentId: string,
  yearMonth: string
): boolean {
  const { start, end } = monthRange(yearMonth);
  const dailyIssue = (issues ?? []).some(
    (item) =>
      item.studentId === studentId &&
      !!item.date &&
      item.date >= start &&
      item.date <= end &&
      isActiveAppearanceIssue(item, removals)
  );
  if (dailyIssue) return true;

  const legacyId = legacyAppearanceIssueId(yearMonth, studentId);
  const legacy = (issues ?? []).find(
    (item) =>
      item.id === legacyId ||
      (item.studentId === studentId && item.yearMonth === yearMonth && !item.date)
  );
  if (!legacy) return false;
  return isActiveAppearanceIssue(legacy, removals);
}

/** @deprecated 請改用 hasAppearanceIssueOnDate 或 hasAppearanceIssueInMonth */
export function hasAppearanceIssue(
  issues: AppearanceIssue[] | undefined,
  removals: AppearanceIssueRemoval[] | undefined,
  studentId: string,
  yearMonth: string
): boolean {
  return hasAppearanceIssueInMonth(issues, removals, studentId, yearMonth);
}

export function countAppearanceIssueDaysInMonth(
  issues: AppearanceIssue[] | undefined,
  removals: AppearanceIssueRemoval[] | undefined,
  studentId: string,
  yearMonth: string
): number {
  const { start, end } = monthRange(yearMonth);
  const dates = new Set(
    (issues ?? [])
      .filter(
        (item) =>
          item.studentId === studentId &&
          !!item.date &&
          item.date >= start &&
          item.date <= end &&
          isActiveAppearanceIssue(item, removals)
      )
      .map((item) => item.date)
  );
  if (dates.size > 0) return dates.size;
  return hasAppearanceIssueInMonth(issues, removals, studentId, yearMonth) ? 1 : 0;
}

export function buildAppearanceReport(
  students: Student[],
  absences: AbsenceRecord[],
  appearanceIssues: AppearanceIssue[] | undefined,
  appearanceIssueRemovals: AppearanceIssueRemoval[] | undefined,
  yearMonth: string,
  academicYear: string
): AppearanceReportPayload {
  const monthly = buildMonthlyReport(students, absences, yearMonth);
  const byClass = new Map(monthly.classes.map((item) => [item.className, item]));
  const flaggedIds = new Set(
    students
      .filter((student) =>
        hasAppearanceIssueInMonth(
          appearanceIssues,
          appearanceIssueRemovals,
          student.id,
          yearMonth
        )
      )
      .map((student) => student.id)
  );

  const classes: AppearanceClassRow[] = allClassNames().map((className) => {
    const summary = byClass.get(className);
    const classStudents = students.filter((item) => item.className === className);
    const studentCount = summary?.studentCount ?? classStudents.length;
    const schoolDays = summary?.schoolDaysInMonth ?? 0;
    const countedAbsenceDays = summary?.countedAbsenceDays ?? 0;
    const lateCount = summary?.lateCount ?? 0;
    const presentDays = Math.max(0, studentCount * schoolDays - countedAbsenceDays);
    const punctualityRate =
      presentDays > 0 ? Math.max(0, (presentDays - lateCount) / presentDays) : 1;
    const attendanceRate = summary ? summary.attendanceRate / 100 : 1;
    const issueCount = classStudents.filter((item) => flaggedIds.has(item.id)).length;
    const appearanceRate = studentCount > 0 ? (studentCount - issueCount) / studentCount : 1;

    return {
      className,
      studentCount,
      issueCount,
      punctualityRate,
      attendanceRate,
      appearanceRate,
    };
  });

  const studentCount = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const issueCount = classes.reduce((sum, item) => sum + item.issueCount, 0);
  const month = Number(yearMonth.slice(5, 7));

  return {
    yearMonth,
    academicYear,
    monthNumber: month,
    monthLabel: `${month}月份`,
    classes,
    totals: {
      studentCount,
      issueCount,
      punctualityRate: average(classes.map((item) => item.punctualityRate)),
      attendanceRate: average(classes.map((item) => item.attendanceRate)),
      appearanceRate: studentCount > 0 ? (studentCount - issueCount) / studentCount : 1,
    },
  };
}

export function appearanceMonthOptions(start: string, end: string): string[] {
  const begin = start.slice(0, 7);
  const last = end.slice(0, 7);
  const months: string[] = [];
  const [sy, sm] = begin.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, 1);
  const [ey, em] = last.split("-").map(Number);
  const limit = new Date(ey, em - 1, 1);
  while (cursor <= limit) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function average(values: number[]): number {
  if (values.length === 0) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
