import { allClassNames } from "@/lib/roster";
import { isCountedTowardAbsence } from "@/lib/rules";
import { buildMonthlyReport, monthRange } from "@/lib/monthly-report";
import type { AbsenceRecord, AppearanceRecord, Student } from "@/lib/types";

export interface AppearanceClassRow {
  className: string;
  punctualityRate: number;
  attendanceRate: number;
  appearanceRate: number | null;
}

export interface AppearanceReportPayload {
  yearMonth: string;
  academicYear: string;
  monthNumber: number;
  monthLabel: string;
  classes: AppearanceClassRow[];
  totals: {
    punctualityRate: number;
    attendanceRate: number;
    appearanceRate: number | null;
  };
}

export function buildAppearanceReport(
  students: Student[],
  absences: AbsenceRecord[],
  appearanceRecords: AppearanceRecord[] | undefined,
  yearMonth: string,
  academicYear: string
): AppearanceReportPayload {
  const monthly = buildMonthlyReport(students, absences, yearMonth);
  const byClass = new Map(monthly.classes.map((item) => [item.className, item]));
  const appearanceByClass = new Map(
    (appearanceRecords ?? [])
      .filter((item) => item.yearMonth === yearMonth)
      .map((item) => [item.className, item.rate])
  );

  const classes: AppearanceClassRow[] = allClassNames().map((className) => {
    const summary = byClass.get(className);
    const studentCount = summary?.studentCount ?? 0;
    const schoolDays = summary?.schoolDaysInMonth ?? 0;
    const countedAbsenceDays = summary?.countedAbsenceDays ?? 0;
    const lateCount = summary?.lateCount ?? 0;
    const presentDays = Math.max(0, studentCount * schoolDays - countedAbsenceDays);
    const punctualityRate =
      presentDays > 0 ? Math.max(0, (presentDays - lateCount) / presentDays) : 1;
    const attendanceRate = summary ? summary.attendanceRate / 100 : 1;
    const rawAppearance = appearanceByClass.get(className);
    const appearanceRate =
      typeof rawAppearance === "number" && Number.isFinite(rawAppearance)
        ? Math.min(1, Math.max(0, rawAppearance))
        : null;

    return {
      className,
      punctualityRate,
      attendanceRate,
      appearanceRate,
    };
  });

  const appearanceValues = classes
    .map((item) => item.appearanceRate)
    .filter((value): value is number => value !== null);
  const month = Number(yearMonth.slice(5, 7));

  return {
    yearMonth,
    academicYear,
    monthNumber: month,
    monthLabel: `${month}月份`,
    classes,
    totals: {
      punctualityRate: average(classes.map((item) => item.punctualityRate)),
      attendanceRate: average(classes.map((item) => item.attendanceRate)),
      appearanceRate:
        appearanceValues.length === 0 ? null : average(appearanceValues),
    },
  };
}

export function appearanceMonthOptions(start: string, end: string): string[] {
  const { start: rangeStart } = monthRange(start.slice(0, 7));
  const last = monthRange(end.slice(0, 7)).end;
  const months: string[] = [];
  const [sy, sm] = rangeStart.split("-").map(Number);
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
