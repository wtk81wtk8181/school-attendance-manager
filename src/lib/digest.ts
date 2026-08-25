import {
  attendanceStatusLabel,
  classLabel,
  isCountedTowardAbsence,
} from "@/lib/rules";
import type { AbsenceRecord, Student } from "@/lib/types";

const documentLabels = {
  doctor: "醫生證明",
  parent: "家長信",
  none: "無文件",
} as const;

const reviewLabels = {
  pending: "待審核",
  approved: "已批准",
  rejected: "未批准",
} as const;

export interface DigestRow {
  date: string;
  className: string;
  classLabel: string;
  studentNo: string;
  name: string;
  nameEn: string;
  teacher: string;
  eclassStatus: string;
  days: number;
  reason: string;
  documentType: string;
  documentSubmitted: string;
  reviewStatus: string;
  counted: string;
}

export interface ClassSummary {
  className: string;
  classLabel: string;
  teacher: string;
  studentCount: number;
  absent: number;
  late: number;
  leave: number;
  pending: number;
  counted: number;
  presentImplied: number;
}

export interface DigestPayload {
  schoolDay: string;
  rows: DigestRow[];
  summaries: ClassSummary[];
}

export function latestSchoolDay(absences: AbsenceRecord[]): string | null {
  if (absences.length === 0) return null;
  return [...absences].map((item) => item.date).sort().at(-1) ?? null;
}

export function absenceDates(absences: AbsenceRecord[]): string[] {
  return [...new Set([hongKongToday(), ...absences.map((item) => item.date)])]
    .sort()
    .reverse();
}

export function hongKongToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function hongKongHHMM(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function resolveDigestSchoolDay(
  absences: AbsenceRecord[],
  preferred?: string
): string {
  if (preferred) return preferred;
  const today = hongKongToday();
  if (absences.some((item) => item.date === today)) return today;
  return latestSchoolDay(absences) ?? today;
}

export function buildDigest(
  students: Student[],
  absences: AbsenceRecord[],
  schoolDay: string
): DigestPayload {
  const dayRecords = absences.filter((item) => item.date === schoolDay);
  const classes = [...new Set(students.map((item) => item.className))].sort();
  const summaries: ClassSummary[] = classes.map((className) => {
    const classStudents = students.filter((item) => item.className === className);
    const classRecords = dayRecords.filter((item) =>
      classStudents.some((student) => student.id === item.studentId)
    );
    const teacher = classStudents[0]?.homeroomTeacherName ?? "";
    const absent = classRecords.filter((item) => item.eclassStatus === "absent").length;
    const late = classRecords.filter((item) => item.eclassStatus === "late").length;
    const leave = classRecords.filter((item) => item.eclassStatus === "leave").length;
    return {
      className,
      classLabel: classLabel(className),
      teacher,
      studentCount: classStudents.length,
      absent,
      late,
      leave,
      pending: classRecords.filter((item) => item.reviewStatus === "pending").length,
      counted: classRecords
        .filter(isCountedTowardAbsence)
        .reduce((sum, item) => sum + item.days, 0),
      presentImplied: Math.max(0, classStudents.length - absent - leave),
    };
  });

  const rows: DigestRow[] = [];
  for (const record of dayRecords) {
    const student = students.find((item) => item.id === record.studentId);
    if (!student) continue;
    rows.push({
      date: record.date,
      className: student.className,
      classLabel: classLabel(student.className),
      studentNo: student.studentNo,
      name: student.name,
      nameEn: student.nameEn,
      teacher: student.homeroomTeacherName,
      eclassStatus: attendanceStatusLabel(record.eclassStatus),
      days: record.days,
      reason: record.reason,
      documentType: documentLabels[record.documentType],
      documentSubmitted: record.documentSubmitted ? "已提交" : "未提交",
      reviewStatus: reviewLabels[record.reviewStatus],
      counted: isCountedTowardAbsence(record) ? "是" : "否",
    });
  }
  rows.sort(
    (a, b) =>
      a.className.localeCompare(b.className) || a.studentNo.localeCompare(b.studentNo)
  );

  return { schoolDay, rows, summaries };
}
