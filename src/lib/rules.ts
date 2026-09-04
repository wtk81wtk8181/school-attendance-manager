import { allClassNames } from "@/lib/roster";
import type {
  AbsenceRecord,
  DayAttendance,
  FormLevel,
  Student,
  StudentStats,
  WarningLetter,
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

export function formLabelEn(form: FormLevel): string {
  return `S.${form}`;
}

const statusLabels = {
  present: "出席",
  absent: "缺席",
  late: "遲到",
  leave: "事假",
  half_absent: "半日缺席",
  early: "早退",
} as const;

export function attendanceStatusLabel(status: DayAttendance): string {
  return statusLabels[status];
}

export function classLabel(className: string): string {
  const form = Number(className[0]) as FormLevel;
  const stream = className.slice(1);
  return `${form}${stream}`;
}

export function classMatchesForm(className: string, form: string): boolean {
  return form === "all" || String(Number(className[0])) === form;
}

export function filterClassNames(classNames: string[], form: string): string[] {
  if (form === "all") return classNames;
  return classNames.filter((name) => classMatchesForm(name, form));
}

export function listClasses(students: Student[]): string[] {
  const names = new Set(students.map((item) => item.className));
  return allClassNames().filter((name) => names.has(name));
}

export { allClassNames, CLASS_STREAMS, FORMS } from "@/lib/roster";

export function countedAbsenceDays(records: AbsenceRecord[]): number {
  return records
    .filter(isCountedTowardAbsence)
    .reduce((sum, record) => sum + record.days, 0);
}

/** 截至指定日期（含當日）的計入缺席天數；可附上當日尚未寫入的紀錄。 */
export function countedAbsenceDaysOnOrBefore(
  records: AbsenceRecord[],
  date: string,
  extra?: AbsenceRecord
): number {
  const list =
    extra && !records.some((item) => item.id === extra.id)
      ? [...records, extra]
      : records;
  return countedAbsenceDays(list.filter((item) => item.date <= date));
}

export function isCountedTowardAbsence(record: AbsenceRecord): boolean {
  return record.reviewStatus !== "approved" && record.eclassStatus !== "late";
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
 * 計入缺席日數 = 無故缺席 + 未批准請假 + 半日缺席（0.5）+ 早退（0.5）
 * 獲批請假（醫生證明／家長信）與遲到不計入，亦不影響出席率
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
  absenceCount = 0,
  lateCount = 0
): WarningType[] {
  const types: WarningType[] = [];
  if (counted >= getWarningThreshold(form)) types.push("half_limit");
  if (counted >= getAbsenceLimit(form)) types.push("over_limit");
  if (absenceCount > FREQUENT_LIMIT) types.push("frequent_absence");
  if (lateCount > FREQUENT_LIMIT) types.push("frequent_late");
  return types;
}

/** 未獲批的缺席紀錄次數（不含遲到） */
export function absenceOccurrences(records: AbsenceRecord[]): number {
  return records.filter(
    (record) =>
      record.reviewStatus !== "approved" &&
      (record.eclassStatus === "absent" || record.eclassStatus === "half_absent")
  ).length;
}

/** 缺陷次數：未獲批的缺席與遲到紀錄各計 1 次（獲批請假不計） */
export function frequentOccurrences(records: AbsenceRecord[]): number {
  return absenceOccurrences(records) + lateOccurrences(records);
}

export function lateOccurrences(records: AbsenceRecord[]): number {
  return records.filter(
    (record) => record.eclassStatus === "late" && record.reviewStatus !== "rejected"
  ).length;
}

export type WarningCategory = "absence" | "late";

export function warningCategory(type: WarningType): WarningCategory {
  return type === "frequent_late" ? "late" : "absence";
}

export function isOccurrenceWarning(type: WarningType): boolean {
  return type === "frequent_absence" || type === "frequent_late";
}

export function formatWarningTrigger(
  type: WarningType,
  triggerDays: number,
  limitDays: number
): string {
  if (type === "frequent_late") return `${formatDays(triggerDays)} 次（遲到）`;
  if (type === "frequent_absence") return `${formatDays(triggerDays)} 次（缺席）`;
  return `${formatDays(triggerDays)} / ${formatDays(limitDays)} 天`;
}

/** 將舊版合併「frequent」警告信拆成缺席／遲到獨立信件 */
export function migrateLegacyWarnings(
  warnings: WarningLetter[],
  absences: AbsenceRecord[]
): WarningLetter[] {
  const existing = new Set(warnings.map((item) => `${item.studentId}:${item.type}`));
  const migrated: WarningLetter[] = [];

  for (const letter of warnings) {
    if (letter.type !== "frequent") {
      migrated.push(letter);
      continue;
    }

    const records = absences.filter((item) => item.studentId === letter.studentId);
    const absenceCount = absenceOccurrences(records);
    const lateCount = lateOccurrences(records);
    const splits: WarningLetter[] = [];

    if (absenceCount > 0 && !existing.has(`${letter.studentId}:frequent_absence`)) {
      splits.push({
        ...letter,
        id: letter.id.replace(/\bfrequent\b/, "frequent_absence"),
        type: "frequent_absence",
        triggerDays: absenceCount,
        limitDays: FREQUENT_LIMIT,
      });
      existing.add(`${letter.studentId}:frequent_absence`);
    }

    if (lateCount > 0 && !existing.has(`${letter.studentId}:frequent_late`)) {
      splits.push({
        ...letter,
        id: letter.id.replace(/\bfrequent\b/, "frequent_late"),
        type: "frequent_late",
        triggerDays: lateCount,
        limitDays: FREQUENT_LIMIT,
        followedUpBy: splits.length > 0 ? undefined : letter.followedUpBy,
        followedUpAt: splits.length > 0 ? undefined : letter.followedUpAt,
        followUpNotes: splits.length > 0 ? undefined : letter.followUpNotes,
        status: splits.length > 0 ? "issued" : letter.status,
      });
      existing.add(`${letter.studentId}:frequent_late`);
    }

    if (splits.length === 0) {
      migrated.push({
        ...letter,
        type: "frequent_absence",
        triggerDays: Math.max(absenceCount, letter.triggerDays),
        limitDays: FREQUENT_LIMIT,
      });
    } else {
      migrated.push(...splits);
    }
  }

  return migrated.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
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

export function formatNameWithCountedDays(name: string, countedDays: number): string {
  const days = Number(countedDays);
  if (!Number.isFinite(days) || days < 2) return name;
  const suffix = `(${formatDays(days)})`;
  if (name.endsWith(suffix)) return name;
  return `${name}${suffix}`;
}

export function progressPercent(counted: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (counted / limit) * 100);
}
