import { monthRange } from "@/lib/monthly-report";
import { CLASS_TEACHERS, allClassNames } from "@/lib/roster";
import {
  classLabel,
  countedAbsenceDays,
  isCountedTowardAbsence,
  lateOccurrences,
  needsDocumentChase,
} from "@/lib/rules";
import type { AbsenceRecord, Student } from "@/lib/types";

export interface WongStudentRow {
  studentId: string;
  className: string;
  classLabel: string;
  studentNo: string;
  name: string;
  teacher: string;
  countedAbsenceDays: number;
  missingDoctorDates: string[];
  missingDoctorDays: number;
  lateCount: number;
  highlight: boolean;
}

export interface WongClassSection {
  className: string;
  classLabel: string;
  teacher: string;
  rows: WongStudentRow[];
}

export interface WongReportPayload {
  yearMonth: string;
  monthLabel: string;
  academicYear: string;
  classes: WongClassSection[];
  totals: {
    studentCount: number;
    studentsWithIssues: number;
    missingDoctorCount: number;
  };
}

export function isMissingDoctorNote(record: AbsenceRecord): boolean {
  if (record.reviewStatus === "approved") return false;
  if (record.eclassStatus === "late" || record.eclassStatus === "early") return false;
  if (record.documentType === "doctor" && !record.documentSubmitted) return true;
  if (record.documentType === "none" && needsDocumentChase(record)) return true;
  return false;
}

function formatMissingDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function buildStudentRow(
  student: Student,
  records: AbsenceRecord[],
  teacher: string
): WongStudentRow {
  const missingRecords = records.filter(isMissingDoctorNote);
  const missingDoctorDates = missingRecords
    .map((item) => formatMissingDate(item.date))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const missingDoctorDays = missingRecords.reduce((sum, item) => sum + item.days, 0);
  const counted = countedAbsenceDays(records);
  const lateCount = lateOccurrences(records);

  return {
    studentId: student.id,
    className: student.className,
    classLabel: classLabel(student.className),
    studentNo: student.studentNo,
    name: student.name,
    teacher,
    countedAbsenceDays: counted,
    missingDoctorDates,
    missingDoctorDays,
    lateCount,
    highlight: missingDoctorDays > 0,
  };
}

export function buildWongReport(
  students: Student[],
  absences: AbsenceRecord[],
  yearMonth: string,
  academicYear: string
): WongReportPayload {
  const { start, end } = monthRange(yearMonth);
  const inRange = absences.filter((item) => item.date >= start && item.date <= end);
  const month = Number(yearMonth.slice(5, 7));

  const classes: WongClassSection[] = allClassNames().map((className) => {
    const classStudents = students
      .filter((item) => item.className === className)
      .sort((a, b) => a.studentNo.localeCompare(b.studentNo));
    const teacher = CLASS_TEACHERS[className] ?? "";

    const rows = classStudents.map((student) => {
      const records = inRange.filter((item) => item.studentId === student.id);
      return buildStudentRow(student, records, teacher);
    });

    return {
      className,
      classLabel: classLabel(className),
      teacher,
      rows,
    };
  });

  const allRows = classes.flatMap((item) => item.rows);
  const studentsWithIssues = allRows.filter(
    (item) =>
      item.countedAbsenceDays > 0 || item.missingDoctorDays > 0 || item.lateCount > 0
  ).length;

  return {
    yearMonth,
    monthLabel: `${month}月份`,
    academicYear,
    classes: classes.filter((item) => item.rows.length > 0),
    totals: {
      studentCount: allRows.length,
      studentsWithIssues,
      missingDoctorCount: allRows.filter((item) => item.highlight).length,
    },
  };
}

/** 供測試或明細頁使用：當月計入缺席紀錄 */
export function countedAbsenceRecordsInMonth(
  records: AbsenceRecord[],
  yearMonth: string
): AbsenceRecord[] {
  const { start, end } = monthRange(yearMonth);
  return records.filter(
    (item) => item.date >= start && item.date <= end && isCountedTowardAbsence(item)
  );
}
