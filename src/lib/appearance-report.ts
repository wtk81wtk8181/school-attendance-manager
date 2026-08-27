import { allClassNames } from "@/lib/roster";
import { buildMonthlyReport } from "@/lib/monthly-report";
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

export function appearanceIssueId(yearMonth: string, studentId: string) {
  return `appear-${yearMonth}-${studentId}`;
}

export function hasAppearanceIssue(
  issues: AppearanceIssue[] | undefined,
  removals: AppearanceIssueRemoval[] | undefined,
  studentId: string,
  yearMonth: string
): boolean {
  const id = appearanceIssueId(yearMonth, studentId);
  const record = (issues ?? []).find((item) => item.id === id);
  if (!record) return false;
  const removal = (removals ?? []).find((item) => item.id === id);
  if (!removal) return true;
  return record.updatedAt > removal.removedAt;
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
    (appearanceIssues ?? [])
      .filter((item) =>
        hasAppearanceIssue(appearanceIssues, appearanceIssueRemovals, item.studentId, yearMonth)
      )
      .filter((item) => item.yearMonth === yearMonth)
      .map((item) => item.studentId)
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
