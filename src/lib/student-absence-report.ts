import { absencesIncludingFormACarry } from "@/lib/hidden-students";
import { isDoctorExemptedLate, formLabel, recordHasEarly, recordHasLate } from "@/lib/rules";
import { SCHOOL_NAME } from "@/lib/seed";
import {
  studentLeaveCategoryLabel,
  withPreApprovedLeaveReview,
} from "@/lib/student-leave";
import type {
  AbsenceRecord,
  AcademicYear,
  AttendanceClear,
  HiddenStudent,
  HiddenStudentRemoval,
  Student,
  StudentLeaveRecord,
} from "@/lib/types";

export const STUDENT_REPORT_FORM_CODE = "R-ATT002-C";
export const STUDENT_REPORT_TITLE = "缺席報告(依學生)";

const FIRST_PAGE_ROWS = 22;
const FIRST_PAGE_WITH_SUMMARY = 16;
const NEXT_PAGE_ROWS = 32;
const NEXT_PAGE_WITH_SUMMARY = 26;

export type ReportSession = "上午" | "下午";
export type ReportCategory = "缺課" | "遲到" | "早退";

export interface StudentAbsenceReportRow {
  date: string;
  dateLabel: string;
  session: ReportSession;
  category: ReportCategory;
  exempt: boolean;
  reason: string;
  notes: string;
}

export interface StudentAbsenceReportSummaryLine {
  category: ReportCategory;
  unit: "天" | "次";
  counted: number;
  exempt: number;
}

export interface StudentAbsenceReportPage {
  rows: StudentAbsenceReportRow[];
  showSummary: boolean;
}

export interface StudentAbsenceReport {
  formCode: string;
  schoolName: string;
  title: string;
  academicYearLabel: string;
  reportDate: string;
  reportDateLabel: string;
  studentName: string;
  schoolLevel: "中學";
  schoolSession: "全日";
  formLabel: string;
  className: string;
  classNumber: string;
  rows: StudentAbsenceReportRow[];
  summary: StudentAbsenceReportSummaryLine[];
  pages: StudentAbsenceReportPage[];
}

export function classNumberFromStudentNo(studentNo: string): string {
  const main = studentNo.split("-")[0] ?? "";
  const digits = main.replace(/\D/g, "");
  if (digits.length < 2) return digits || "—";
  return String(Number(digits.slice(-2)));
}

export function reportStudentName(student: Pick<Student, "name" | "nameEn">): string {
  const en = student.nameEn.trim().toUpperCase();
  const zh = student.name.trim();
  if (en && zh) return `${en} (${zh})`;
  return en || zh || "—";
}

export function formatReportDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatSummaryTotal(line: StudentAbsenceReportSummaryLine): string {
  if (line.unit === "天") {
    return `${line.counted.toFixed(1)} 天  (扣除 ${line.exempt.toFixed(1)} 天豁免紀錄)`;
  }
  return `${Math.round(line.counted)} 次  (扣除 ${Math.round(line.exempt)} 次豁免紀錄)`;
}

export function academicYearSlashLabel(label: string): string {
  return label.trim().replace("-", "/");
}

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function isWeekday(isoDate: string): boolean {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function schoolDaysInclusive(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const days: string[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 400) {
    if (isWeekday(cursor)) days.push(cursor);
    cursor = addUtcDays(cursor, 1);
    guard += 1;
  }
  return days;
}

function clockHour(value: string | undefined): number | null {
  const match = value?.trim().match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour > 23) return null;
  return hour;
}

function sessionFromClock(value: string | undefined, fallback: ReportSession): ReportSession {
  const hour = clockHour(value);
  if (hour === null) return fallback;
  return hour < 12 ? "上午" : "下午";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function displayReason(reason: string | undefined, fallback: string): string {
  const value = reason?.trim() ?? "";
  return value || fallback;
}

function displayNotes(record: AbsenceRecord): string {
  if (record.id.startsWith("forma-carry-")) return "Form A";
  const notes = record.notes?.trim() ?? "";
  if (notes.startsWith("系統按連續")) return "Form A";
  return notes;
}

function absenceExempt(record: AbsenceRecord): boolean {
  return record.reviewStatus === "approved";
}

function lateExempt(record: AbsenceRecord): boolean {
  return isDoctorExemptedLate(record) || record.reviewStatus === "rejected";
}

const sessionOrder: Record<ReportSession, number> = { 上午: 0, 下午: 1 };
const categoryOrder: Record<ReportCategory, number> = { 遲到: 0, 早退: 1, 缺課: 2 };

function compareRows(a: StudentAbsenceReportRow, b: StudentAbsenceReportRow): number {
  return (
    a.date.localeCompare(b.date) ||
    sessionOrder[a.session] - sessionOrder[b.session] ||
    categoryOrder[a.category] - categoryOrder[b.category]
  );
}

function pushRow(
  rows: StudentAbsenceReportRow[],
  record: AbsenceRecord,
  session: ReportSession,
  category: ReportCategory,
  exempt: boolean,
  reason: string
) {
  rows.push({
    date: record.date,
    dateLabel: formatReportDate(record.date),
    session,
    category,
    exempt,
    reason,
    notes: displayNotes(record),
  });
}

export function expandAbsenceRecord(record: AbsenceRecord): StudentAbsenceReportRow[] {
  const rows: StudentAbsenceReportRow[] = [];
  const lessonReason = displayReason(record.reason, "缺席");
  const lessonExempt = absenceExempt(record);

  if (recordHasLate(record)) {
    const reason =
      record.eclassStatus === "late" ? displayReason(record.reason, "遲到") : "遲到";
    pushRow(rows, record, "上午", "遲到", lateExempt(record), reason);
  }

  if (record.eclassStatus === "half_absent") {
    pushRow(rows, record, "上午", "缺課", lessonExempt, lessonReason);
  } else if (record.eclassStatus === "absent" || record.eclassStatus === "leave") {
    pushRow(rows, record, "上午", "缺課", lessonExempt, lessonReason);
    if (record.days !== 0.5) {
      pushRow(rows, record, "下午", "缺課", lessonExempt, lessonReason);
    }
  }

  if (recordHasEarly(record)) {
    pushRow(
      rows,
      record,
      sessionFromClock(record.earlyAt, "下午"),
      "早退",
      lessonExempt,
      lessonReason
    );
  }

  return rows;
}

function takeRows(rows: StudentAbsenceReportRow[], start: number, max: number): number {
  const hardEnd = Math.min(start + max, rows.length);
  if (hardEnd >= rows.length || hardEnd === start) return hardEnd;
  const splitDate = rows[hardEnd - 1]?.date;
  if (!splitDate || rows[hardEnd]?.date !== splitDate) return hardEnd;
  let end = hardEnd;
  while (end > start && rows[end - 1]?.date === splitDate) end -= 1;
  return end > start ? end : hardEnd;
}

export function paginateStudentAbsenceReport(
  rows: StudentAbsenceReportRow[]
): StudentAbsenceReportPage[] {
  if (rows.length === 0) return [{ rows: [], showSummary: true }];
  if (rows.length <= FIRST_PAGE_WITH_SUMMARY) {
    return [{ rows, showSummary: true }];
  }

  const pages: StudentAbsenceReportPage[] = [];
  let index = 0;
  const firstEnd = takeRows(rows, 0, FIRST_PAGE_ROWS);
  pages.push({ rows: rows.slice(0, firstEnd), showSummary: false });
  index = firstEnd;

  while (index < rows.length) {
    const remaining = rows.length - index;
    if (remaining <= NEXT_PAGE_WITH_SUMMARY) {
      pages.push({ rows: rows.slice(index), showSummary: true });
      return pages;
    }
    const end = takeRows(rows, index, NEXT_PAGE_ROWS);
    pages.push({ rows: rows.slice(index, end), showSummary: false });
    if (end <= index) break;
    index = end;
  }

  if (!pages.at(-1)?.showSummary) pages.push({ rows: [], showSummary: true });
  return pages;
}

function summarize(rows: StudentAbsenceReportRow[]): StudentAbsenceReportSummaryLine[] {
  const specs: Array<{ category: ReportCategory; unit: "天" | "次"; weight: number }> = [
    { category: "缺課", unit: "天", weight: 0.5 },
    { category: "遲到", unit: "次", weight: 1 },
    { category: "早退", unit: "次", weight: 1 },
  ];
  return specs.map((spec) => {
    const matched = rows.filter((row) => row.category === spec.category);
    const exemptCount = matched.filter((row) => row.exempt).length;
    const exempt = round1(exemptCount * spec.weight);
    const total = round1(matched.length * spec.weight);
    return {
      category: spec.category,
      unit: spec.unit,
      counted: round1(total - exempt),
      exempt,
    };
  });
}

function leaveReason(leave: StudentLeaveRecord): string {
  const category = studentLeaveCategoryLabel(leave.category);
  const activity = leave.activity.trim();
  const extra = leave.reason.trim();
  return extra || (activity ? `${category}（${activity}）` : category);
}

function syntheticLeaveRecord(leave: StudentLeaveRecord, date: string): AbsenceRecord {
  const activity = leave.activity.trim();
  return {
    id: `pleave-${leave.id}-${date}`,
    studentId: leave.studentId,
    date,
    days: 1,
    eclassStatus: leave.status,
    reason: leaveReason(leave),
    documentType: "none",
    documentSubmitted: false,
    reviewStatus: "pending",
    notes: activity ? `預先登記：${activity}` : "預先登記請假",
    source: "office",
  };
}

export function buildStudentAbsenceReport(input: {
  student: Student;
  absences: AbsenceRecord[];
  academicYear: Pick<AcademicYear, "label" | "start" | "end">;
  reportDate: string;
  hiddenStudents?: HiddenStudent[];
  hiddenRemovals?: HiddenStudentRemoval[];
  clearedAttendance?: AttendanceClear[];
  studentLeaves?: StudentLeaveRecord[];
}): StudentAbsenceReport {
  const { student, academicYear } = input;
  const through =
    input.reportDate > academicYear.end ? academicYear.end : input.reportDate;
  const yearStart = academicYear.start;
  const cleared = new Set(
    (input.clearedAttendance ?? [])
      .filter((item) => item.studentId === student.id)
      .map((item) => item.date)
  );

  const sourced = absencesIncludingFormACarry(
    input.absences,
    input.hiddenStudents,
    input.hiddenRemovals,
    input.clearedAttendance,
    through
  )
    .filter(
      (item) =>
        item.studentId === student.id &&
        item.date >= yearStart &&
        item.date <= through &&
        !cleared.has(item.date)
    )
    .map((item) => withPreApprovedLeaveReview(item, input.studentLeaves));

  const covered = new Set(sourced.map((item) => item.date));
  const synthetic: AbsenceRecord[] = [];
  for (const leave of input.studentLeaves ?? []) {
    if (leave.studentId !== student.id) continue;
    const from = leave.startDate > yearStart ? leave.startDate : yearStart;
    const end = leave.endDate || leave.startDate;
    const to = end < through ? end : through;
    for (const date of schoolDaysInclusive(from, to)) {
      if (covered.has(date) || cleared.has(date)) continue;
      covered.add(date);
      synthetic.push(
        withPreApprovedLeaveReview(syntheticLeaveRecord(leave, date), input.studentLeaves)
      );
    }
  }

  const rows = [...sourced, ...synthetic].flatMap(expandAbsenceRecord).sort(compareRows);
  const summary = summarize(rows);

  return {
    formCode: STUDENT_REPORT_FORM_CODE,
    schoolName: SCHOOL_NAME,
    title: STUDENT_REPORT_TITLE,
    academicYearLabel: academicYearSlashLabel(academicYear.label),
    reportDate: through,
    reportDateLabel: formatReportDate(through),
    studentName: reportStudentName(student),
    schoolLevel: "中學",
    schoolSession: "全日",
    formLabel: formLabel(student.form),
    className: student.className,
    classNumber: classNumberFromStudentNo(student.studentNo),
    rows,
    summary,
    pages: paginateStudentAbsenceReport(rows),
  };
}
