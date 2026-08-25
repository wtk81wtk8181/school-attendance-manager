import { classLabel } from "@/lib/rules";
import type {
  AbsenceRecord,
  Student,
  StudentLeaveCategory,
  StudentLeaveRecord,
} from "@/lib/types";

export const STUDENT_LEAVE_CATEGORIES: Array<{
  value: StudentLeaveCategory;
  label: string;
}> = [
  { value: "checkup", label: "複診" },
  { value: "surgery", label: "手術" },
  { value: "funeral", label: "白事" },
  { value: "personal", label: "事假" },
  { value: "official", label: "公假／外出活動／比賽" },
  { value: "sick", label: "病假" },
  { value: "other", label: "其他" },
];

export function studentLeaveCategoryLabel(category: StudentLeaveCategory): string {
  return STUDENT_LEAVE_CATEGORIES.find((item) => item.value === category)?.label ?? "其他";
}

export function studentLeavesForDate(
  records: StudentLeaveRecord[] | undefined,
  date: string
): StudentLeaveRecord[] {
  return (records ?? []).filter(
    (item) => item.startDate <= date && (item.endDate || item.startDate) >= date
  );
}

export function formatStudentLeaveLine(record: StudentLeaveRecord): string {
  const category = studentLeaveCategoryLabel(record.category);
  const activity = record.activity.trim() ? `（${record.activity.trim()}）` : "";
  const reason = record.reason.trim() ? `—${record.reason.trim()}` : "";
  return `${classLabel(record.className)}　${record.studentName}（${category}${activity}）${reason}`;
}

export function effectiveAbsencesForDay(
  absences: AbsenceRecord[],
  studentLeaves: StudentLeaveRecord[] | undefined,
  students: Student[],
  schoolDay: string
): AbsenceRecord[] {
  const dayAbsences = absences.filter((item) => item.date === schoolDay);
  const covered = new Set(dayAbsences.map((item) => item.studentId));
  const synthetic: AbsenceRecord[] = [];

  for (const leave of studentLeavesForDate(studentLeaves, schoolDay)) {
    if (covered.has(leave.studentId)) continue;
    const student = students.find((item) => item.id === leave.studentId);
    if (!student) continue;
    synthetic.push({
      id: `pleave-${leave.id}-${schoolDay}`,
      studentId: leave.studentId,
      date: schoolDay,
      days: 1,
      eclassStatus: leave.status,
      reason: leave.reason.trim() || studentLeaveCategoryLabel(leave.category),
      documentType: "none",
      documentSubmitted: false,
      reviewStatus: "pending",
      notes: leave.activity.trim()
        ? `預先登記：${leave.activity.trim()}`
        : "預先登記請假",
      source: "office",
    });
  }

  return [...dayAbsences, ...synthetic];
}

export function studentMatchesQuery(student: Student, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    student.name.toLowerCase().includes(normalized) ||
    student.nameEn.toLowerCase().includes(normalized) ||
    student.studentNo.toLowerCase().includes(normalized) ||
    classLabel(student.className).toLowerCase().includes(normalized) ||
    student.className.toLowerCase().includes(normalized)
  );
}
