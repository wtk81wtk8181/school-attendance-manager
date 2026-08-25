import { attendanceStatusLabel, classLabel, formLabel } from "@/lib/rules";
import { formatSchoolReportDate } from "@/lib/format";
import { allClassNames } from "@/lib/roster";
import {
  applyStaffLeavesToDaily,
  formatStaffLeaveLine,
  staffNamesForKind,
  staffDailyFor,
  staffLeavesForDate,
} from "@/lib/staff";
import {
  effectiveAbsencesForDay,
  formatStudentLeaveLine,
  studentLeavesForDate,
} from "@/lib/student-leave";
import {
  formatEarlyLeaveReportLine,
  formatHalfAbsentReportLine,
} from "@/lib/attendance-extras";
import type {
  AbsenceRecord,
  DayAttendance,
  EarlyPickup,
  FormLevel,
  StaffAbsenceKind,
  StaffDailyAbsence,
  StaffLeaveRecord,
  StaffMember,
  Student,
  StudentLeaveRecord,
} from "@/lib/types";

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
  statusKey: Exclude<DayAttendance, "present">;
  days: number;
  reason: string;
  calledBy: string;
  calledAt: string;
  returnedAt: string;
  earlyAt: string;
  earlyPickup?: EarlyPickup;
}

export interface DailyClassBlock {
  className: string;
  classLabel: string;
  form: FormLevel;
  registered: number;
  present: number;
  earlyLeave: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
  punctualityRate: number;
  absenceLines: string[];
}

export interface DailyFormStat {
  form: FormLevel;
  label: string;
  present: number;
  registered: number;
  attendanceRate: number;
}

export interface DailySchoolReportPayload {
  schoolDay: string;
  scope: string;
  dateLabel: string;
  rows: DailyAbsenceRow[];
  classes: DailyClassBlock[];
  formStats: DailyFormStat[];
  totalPresent: number;
  totalRegistered: number;
  totalAttendanceRate: number;
  totalAbsent: number;
  totalLate: number;
  schoolPunctualityRate: number;
  staff: Record<StaffAbsenceKind, string[]>;
  staffLeaveLines: string[];
  studentLeaveLines: string[];
}

/** @deprecated 使用 DailySchoolReportPayload */
export type DailyReportPayload = DailySchoolReportPayload;

export function buildDailyAbsenceRows(
  students: Student[],
  absences: AbsenceRecord[],
  schoolDay: string,
  studentLeaveRecords: StudentLeaveRecord[] = []
): DailyAbsenceRow[] {
  const dayAbsences = effectiveAbsencesForDay(
    absences,
    studentLeaveRecords,
    students,
    schoolDay
  );
  return dayAbsences
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
        status: attendanceStatusLabel(item.eclassStatus),
        statusKey: item.eclassStatus,
        days: item.days,
        reason: item.reason,
        calledBy: item.calledBy?.trim() || "尚未致電",
        calledAt: item.calledAt?.trim() || "—",
        returnedAt: item.returnedAt?.trim() || "",
        earlyAt: item.earlyAt?.trim() || "",
        earlyPickup: item.earlyPickup,
      };
    })
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) || a.studentNo.localeCompare(b.studentNo)
    );
}

export function formatDailyAbsenceLine(row: DailyAbsenceRow): string {
  if (row.statusKey === "half_absent") {
    return formatHalfAbsentReportLine(row.name, row.reason, row.returnedAt);
  }
  if (row.statusKey === "early") {
    return formatEarlyLeaveReportLine(row.name, row.reason, row.earlyAt, row.earlyPickup);
  }
  const reason = row.reason.trim() || row.status;
  const half = row.days === 0.5 ? "（半日）" : "";
  const caller =
    row.calledBy && row.calledBy !== "尚未致電" ? row.calledBy : "";
  const time = row.calledAt && row.calledAt !== "—" ? row.calledAt : "";
  const suffix = caller ? `(${caller})` : "";
  return `${row.name}：${reason}${half}${suffix}${time}`;
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 1;
  return numerator / denominator;
}

export function buildDailySchoolReport(
  students: Student[],
  absences: AbsenceRecord[],
  schoolDay: string,
  staffMembers: StaffMember[] = [],
  staffDailyAbsences: StaffDailyAbsence[] = [],
  scope = "全校",
  staffLeaveRecords: StaffLeaveRecord[] = [],
  studentLeaveRecords: StudentLeaveRecord[] = []
): DailySchoolReportPayload {
  const rows = buildDailyAbsenceRows(
    students,
    absences,
    schoolDay,
    studentLeaveRecords
  );
  const studentIds = new Set(students.map((item) => item.id));
  const dayStudentLeaves = studentLeavesForDate(studentLeaveRecords, schoolDay).filter(
    (item) => studentIds.has(item.studentId)
  );
  const classNames = allClassNames();
  const classes: DailyClassBlock[] = classNames.map((className) => {
    const classStudents = students.filter((item) => item.className === className);
    const classRows = rows.filter((item) => item.className === className);
    const notPresent = classRows.filter(
      (item) =>
        item.statusKey === "absent" ||
        item.statusKey === "leave" ||
        item.statusKey === "half_absent"
    );
    const earlyRows = classRows.filter((item) => item.statusKey === "early");
    const lateCount = classRows.filter((item) => item.statusKey === "late").length;
    const registered = classStudents.length;
    const present = Math.max(0, registered - notPresent.length);
    const form = Number(className[0]) as FormLevel;
    return {
      className,
      classLabel: classLabel(className),
      form,
      registered,
      present,
      earlyLeave: earlyRows.length,
      lateCount,
      absentCount: notPresent.length,
      attendanceRate: rate(present, registered),
      punctualityRate: rate(Math.max(0, present - lateCount), present),
      absenceLines: [...notPresent, ...earlyRows].map(formatDailyAbsenceLine),
    };
  });

  const formStats: DailyFormStat[] = ([1, 2, 3, 4, 5, 6] as FormLevel[]).map((form) => {
    const items = classes.filter((item) => item.form === form);
    const present = items.reduce((sum, item) => sum + item.present, 0);
    const registered = items.reduce((sum, item) => sum + item.registered, 0);
    return {
      form,
      label: formLabel(form),
      present,
      registered,
      attendanceRate: rate(present, registered),
    };
  });

  const totalPresent = formStats.reduce((sum, item) => sum + item.present, 0);
  const totalRegistered = formStats.reduce((sum, item) => sum + item.registered, 0);
  const totalLate = classes.reduce((sum, item) => sum + item.lateCount, 0);
  const totalAbsent = classes.reduce((sum, item) => sum + item.absentCount, 0);
  const dayLeaves = staffLeavesForDate(staffLeaveRecords, schoolDay);
  const staffRecord = applyStaffLeavesToDaily(
    staffDailyFor(staffDailyAbsences, schoolDay),
    dayLeaves,
    ""
  );

  return {
    schoolDay,
    scope,
    dateLabel: formatSchoolReportDate(schoolDay),
    rows,
    classes,
    formStats,
    totalPresent,
    totalRegistered,
    totalAttendanceRate: rate(totalPresent, totalRegistered),
    totalAbsent,
    totalLate,
    schoolPunctualityRate: rate(
      Math.max(0, totalPresent - totalLate),
      totalPresent
    ),
    staff: {
      sick: staffNamesForKind(staffMembers, staffRecord, "sick"),
      personal: staffNamesForKind(staffMembers, staffRecord, "personal"),
      official: staffNamesForKind(staffMembers, staffRecord, "official"),
      early: staffNamesForKind(staffMembers, staffRecord, "early"),
    },
    staffLeaveLines: dayLeaves.map(formatStaffLeaveLine),
    studentLeaveLines: dayStudentLeaves.map(formatStudentLeaveLine),
  };
}
