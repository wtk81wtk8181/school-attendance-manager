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

export interface ClassMonthlySummary {
  className: string;
  classLabel: string;
  teacher: string;
  studentCount: number;
  schoolDaysInMonth: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  countedAbsenceDays: number;
  approvedLeaveDays: number;
  pendingDays: number;
  studentsWithAbsence: number;
  attendanceRate: number;
}

export interface MonthlyStudentRow {
  date: string;
  className: string;
  classLabel: string;
  studentNo: string;
  name: string;
  nameEn: string;
  teacher: string;
  status: string;
  days: number;
  reason: string;
  documentType: string;
  documentSubmitted: string;
  reviewStatus: string;
  counted: string;
}

export interface MonthlyReportPayload {
  yearMonth: string;
  monthLabel: string;
  classes: ClassMonthlySummary[];
  rows: MonthlyStudentRow[];
}

/** 「YYYY-MM」→ 該月首日與末日（ISO 日期字串） */
export function monthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const iso = (date: Date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  return { start: iso(first), end: iso(last) };
}

/** 該月內的星期一至星期五日數（作為上課日推算） */
export function weekdayCount(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let count = 0;
  for (const date = new Date(sy, sm - 1, sd); date <= new Date(ey, em - 1, ed); ) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) count += 1;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

export function currentYearMonth(): string {
  return hongKongToday().slice(0, 7);
}

function hongKongToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function buildMonthlyReport(
  students: Student[],
  absences: AbsenceRecord[],
  yearMonth: string
): MonthlyReportPayload {
  const { start, end } = monthRange(yearMonth);
  const inRange = absences.filter((item) => item.date >= start && item.date <= end);
  const classes = [...new Set(students.map((item) => item.className))].sort();
  const schoolDaysInMonth = weekdayCount(start, end);

  const summaries: ClassMonthlySummary[] = classes.map((className) => {
    const classStudents = students.filter((item) => item.className === className);
    const classRecords = inRange.filter((item) =>
      classStudents.some((student) => student.id === item.studentId)
    );
    const nonApproved = classRecords.filter(isCountedTowardAbsence);
    const countedAbsenceDays = nonApproved.reduce((sum, item) => sum + item.days, 0);
    const absentees = new Set(nonApproved.map((item) => item.studentId));
    // 全班平均出席率（獲批請假不計入）
    const totalRate =
      classStudents.length === 0
        ? 100
        : classStudents.reduce((sum, student) => {
            const records = classRecords.filter((item) => item.studentId === student.id);
            const days = records
              .filter(isCountedTowardAbsence)
              .reduce((total, item) => total + item.days, 0);
            return (
              sum + (schoolDaysInMonth > 0 ? ((schoolDaysInMonth - days) / schoolDaysInMonth) * 100 : 100)
            );
          }, 0);

    return {
      className,
      classLabel: classLabel(className),
      teacher: classStudents[0]?.homeroomTeacherName ?? "",
      studentCount: classStudents.length,
      schoolDaysInMonth,
      absentCount: classRecords.filter((item) => item.eclassStatus === "absent").length,
      lateCount: classRecords.filter((item) => item.eclassStatus === "late").length,
      leaveCount: classRecords.filter((item) => item.eclassStatus === "leave").length,
      countedAbsenceDays,
      approvedLeaveDays: classRecords
        .filter(
          (item) =>
            item.reviewStatus === "approved" && item.eclassStatus === "leave"
        )
        .reduce((sum, item) => sum + item.days, 0),
      pendingDays: classRecords
        .filter((item) => item.reviewStatus === "pending" && item.eclassStatus !== "late")
        .reduce((sum, item) => sum + item.days, 0),
      studentsWithAbsence: absentees.size,
      attendanceRate:
        classStudents.length === 0 ? 100 : totalRate / classStudents.length,
    };
  });

  const rows: MonthlyStudentRow[] = [];
  for (const record of inRange) {
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
      status: attendanceStatusLabel(record.eclassStatus),
      days: record.days,
      reason: record.reason,
      documentType: documentLabels[record.documentType],
      documentSubmitted: record.documentSubmitted ? "已提交" : "未提交",
      reviewStatus: reviewLabels[record.reviewStatus],
      counted: isCountedTowardAbsence(record) ? "是" : "否",
    });
  }
  rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.className.localeCompare(b.className)
  );

  const [year, month] = yearMonth.split("-").map(Number);
  return {
    yearMonth,
    monthLabel: `${year} 年 ${month} 月`,
    classes: summaries,
    rows,
  };
}
