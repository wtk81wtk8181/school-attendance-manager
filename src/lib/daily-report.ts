import { classLabel } from "@/lib/rules";
import type { AbsenceRecord, Student } from "@/lib/types";

export interface DailyAbsenceRow {
  id: string;
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
  calledBy: string;
  calledAt: string;
}

export function buildDailyAbsenceRows(
  students: Student[],
  absences: AbsenceRecord[],
  schoolDay: string
): DailyAbsenceRow[] {
  return absences
    .filter((item) => item.date === schoolDay)
    .map((item) => {
      const student = students.find((row) => row.id === item.studentId);
      return {
        id: item.id,
        date: item.date,
        className: student?.className ?? "",
        classLabel: student ? classLabel(student.className) : "",
        studentNo: student?.studentNo ?? "",
        name: student?.name ?? "未知學生",
        nameEn: student?.nameEn ?? "",
        teacher: student?.homeroomTeacherName ?? "",
        status: item.eclassStatus === "leave" ? "請假" : "缺席",
        days: item.days,
        reason: item.reason,
        calledBy: item.calledBy?.trim() || "尚未致電",
        calledAt: item.calledAt?.trim() || "—",
      };
    })
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) || a.studentNo.localeCompare(b.studentNo)
    );
}
