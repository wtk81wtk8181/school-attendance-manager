import { allClassNames } from "@/lib/roster";
import type {
  AbsenceRecord,
  DayAttendance,
  FormLevel,
  Student,
  StudentStats,
  WarningType,
} from "@/lib/types";

/** 中一至中五上限 9 天；中六上限 4.5 天 */
export function getAbsenceLimit(form: FormLevel): number {
  return form === 6 ? 4.5 : 9;
}

/** 中一至中五達 4 天預警；中六達 2 天預警 */
export function getWarningThreshold(form: FormLevel): number {
  return form === 6 ? 2 : 4;
}

/** 缺席／遲到合計超過 3 次即觸發預警警告信 */
export const FREQUENT_LIMIT = 3;

export function formLabel(form: FormLevel): string {
  return ["", "中一", "中二", "中三", "中四", "中五", "中六"][form] ?? `中${form}`;
}

const statusLabels = {
  present: "出席",
  absent: "缺席",
  late: "遲到",
  leave: "請假",
} as const;

export function attendanceStatusLabel(status: DayAttendance): string {
  return statusLabels[status];
}

export function classLabel(className: string): string {
  const form = Number(className[0]) as FormLevel;
  const stream = className.slice(1);
  return `${formLabel(form)}${stream}`;
}

export function listClasses(students: Student[]): string[] {
  const names = new Set(students.map((item) => item.className));
  return allClassNames().filter((name) => names.has(name));
}

export { allClassNames, CLASS_STREAMS, FORMS } from "@/lib/roster";

export function countedAbsenceDays(records: AbsenceRecord[]): number {
  return records
    .filter(
      (record) =>
        record.reviewStatus !== "approved" && record.eclassStatus !== "late"
    )
    .reduce((sum, record) => sum + record.days, 0);
}

export function approvedLeaveDays(records: AbsenceRecord[]): number {
  return records
    .filter(
      (record) =>
        record.reviewStatus === "approved" && record.eclassStatus === "leave"
    )
    .reduce((sum, record) => sum + record.days, 0);
}

export function pendingDays(records: AbsenceRecord[]): number {
  return records
    .filter(
      (record) =>
        record.reviewStatus === "pending" && record.eclassStatus !== "late"
    )
    .reduce((sum, record) => sum + record.days, 0);
}

/**
 * 出席率 = (總上課日數 − 計入缺席日數) ÷ 總上課日數 × 100%
 * 計入缺席日數 = 無故缺席 + 未批准請假
 * 獲批請假（醫生證明／家長信）不計入，亦不影響出席率
 */
export function attendanceRate(schoolDays: number, countedDays: number): number {
  if (schoolDays <= 0) return 100;
  return ((schoolDays - countedDays) / schoolDays) * 100;
}

export function alertLevel(
  counted: number,
  form: FormLevel
): StudentStats["level"] {
  if (counted >= getAbsenceLimit(form)) return "over";
  if (counted >= getWarningThreshold(form)) return "warning";
  return "ok";
}

export function neededWarningTypes(
  counted: number,
  form: FormLevel,
  frequentCount = 0
): WarningType[] {
  const types: WarningType[] = [];
  if (counted >= getWarningThreshold(form)) types.push("half_limit");
  if (counted >= getAbsenceLimit(form)) types.push("over_limit");
  if (frequentCount > FREQUENT_LIMIT) types.push("frequent");
  return types;
}

/** 缺陷次數：未獲批的缺席與遲到紀錄各計 1 次（獲批請假不計） */
export function frequentOccurrences(records: AbsenceRecord[]): number {
  return records.filter(
    (record) =>
      record.reviewStatus !== "approved" &&
      (record.eclassStatus === "absent" || record.eclassStatus === "late")
  ).length;
}

export function lateOccurrences(records: AbsenceRecord[]): number {
  return records.filter((record) => record.eclassStatus === "late").length;
}

export function buildStudentStats(
  student: Student,
  absences: AbsenceRecord[],
  schoolDays: number
): StudentStats {
  const records = absences.filter((item) => item.studentId === student.id);
  const counted = countedAbsenceDays(records);
  return {
    student,
    totalAbsences: records.reduce((sum, item) => sum + item.days, 0),
    countedDays: counted,
    approvedLeaveDays: approvedLeaveDays(records),
    pendingDays: pendingDays(records),
    lateCount: lateOccurrences(records),
    frequentCount: frequentOccurrences(records),
    attendanceRate: attendanceRate(schoolDays, counted),
    limit: getAbsenceLimit(student.form),
    warningThreshold: getWarningThreshold(student.form),
    level: alertLevel(counted, student.form),
  };
}

/** 尚未獲批、且未交齊醫生紙或家長信，需要老師追收 */
export function needsDocumentChase(record: AbsenceRecord): boolean {
  if (record.reviewStatus === "approved") return false;
  return !record.documentSubmitted || record.reviewStatus === "rejected";
}

export function documentNeededLabel(record: AbsenceRecord): string {
  if (record.documentType === "doctor") return "醫生紙";
  if (record.documentType === "parent") return "家長信";
  return "醫生紙或家長信";
}

export function getDayAttendance(
  absences: AbsenceRecord[],
  studentId: string,
  date: string
): DayAttendance {
  const record = absences.find(
    (item) => item.studentId === studentId && item.date === date
  );
  return record?.eclassStatus ?? "present";
}

export function formatDays(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

export function progressPercent(counted: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (counted / limit) * 100);
}
