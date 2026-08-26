import { CLASS_STREAMS, FORMS } from "@/lib/roster";
import { buildDailySchoolReport } from "@/lib/daily-report";
import {
  applyStaffLeavesToDaily,
  staffDailyFor,
  staffLeaveCategoryLabel,
  staffLeavesForDate,
  staffNamesForKind,
  STAFF_ABSENCE_ROWS,
} from "@/lib/staff";
import type {
  AbsenceRecord,
  FormLevel,
  HiddenStudent,
  HiddenStudentRemoval,
  StaffLeaveCategory,
  StaffLeaveRecord,
  StaffMember,
  Student,
  StudentLeaveRecord,
  StaffDailyAbsence,
} from "@/lib/types";

const WEEKDAY_LABELS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const LO_OFFICE_NAMES = new Set(["黎嘉欣", "凌梓健", "戚添彩"]);
const LO_JANITOR_NAMES = new Set(["陳月嬌", "商銀英", "許會招"]);

export type LoStaffGroup = "teachers" | "office" | "janitors";

export interface LoFormDayStat {
  form: FormLevel;
  present: number;
  registered: number;
  attendanceRate: number;
  absent: number;
}

export interface LoDayStudentStats {
  date: string;
  weekdayLabel: string;
  forms: LoFormDayStat[];
  totalPresent: number;
  totalRegistered: number;
  totalAttendanceRate: number;
  totalAbsent: number;
}

export interface LoDayStaff {
  date: string;
  weekdayLabel: string;
  teachers: string[];
  office: string[];
  janitors: string[];
}

export interface LoReportPayload {
  academicYearLabel: string;
  schoolDay: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  sheetName: string;
  filename: string;
  classCounts: number[];
  days: LoDayStudentStats[];
  staffDays: LoDayStaff[];
}

export function mondayOfWeek(isoDate: string): string {
  const weekday = weekdayUtc(isoDate);
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addUtcDays(isoDate, offset);
}

export function weekdaysOf(weekStart: string): string[] {
  return [0, 1, 2, 3, 4].map((offset) => addUtcDays(weekStart, offset));
}

export function loWeekFileLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)}-${Number(month)}-${year}`;
}

export function buildLoReport(
  students: Student[],
  absences: AbsenceRecord[],
  schoolDay: string,
  staffMembers: StaffMember[] = [],
  staffDailyAbsences: StaffDailyAbsence[] = [],
  staffLeaveRecords: StaffLeaveRecord[] = [],
  studentLeaveRecords: StudentLeaveRecord[] = [],
  hiddenStudents: HiddenStudent[] = [],
  hiddenStudentRemovals: HiddenStudentRemoval[] = [],
  academicYearLabel = "2026-2027"
): LoReportPayload {
  const weekStart = mondayOfWeek(schoolDay);
  const dates = weekdaysOf(weekStart);
  const weekEnd = dates[dates.length - 1];
  const weekLabel = loWeekFileLabel(weekStart);
  const dayLabel = loWeekFileLabel(schoolDay);
  const classCounts = FORMS.map(() => CLASS_STREAMS.length);

  const days = dates.map((date) => {
    const report = buildDailySchoolReport(
      students,
      absences,
      date,
      staffMembers,
      staffDailyAbsences,
      "全校",
      staffLeaveRecords,
      studentLeaveRecords,
      hiddenStudents,
      hiddenStudentRemovals
    );
    const forms: LoFormDayStat[] = report.formStats.map((item) => ({
      form: item.form,
      present: item.present,
      registered: item.registered,
      attendanceRate: item.attendanceRate,
      absent: Math.max(0, item.registered - item.present),
    }));
    return {
      date,
      weekdayLabel: weekdayLabel(date),
      forms,
      totalPresent: report.totalPresent,
      totalRegistered: report.totalRegistered,
      totalAttendanceRate: report.totalAttendanceRate,
      totalAbsent: report.totalAbsent,
    };
  });

  const staffDays = dates.map((date) => ({
    date,
    weekdayLabel: weekdayLabel(date),
    ...staffGroupsForDate(date, staffMembers, staffDailyAbsences, staffLeaveRecords),
  }));

  return {
    academicYearLabel,
    schoolDay,
    weekStart,
    weekEnd,
    weekLabel,
    sheetName: `${Number(weekStart.slice(8))}.${Number(weekStart.slice(5, 7))}`,
    filename: `Daily Attendance Report (羅小姐) ${dayLabel}.xlsx`,
    classCounts,
    days,
    staffDays,
  };
}

function staffGroupsForDate(
  date: string,
  members: StaffMember[],
  staffDailyAbsences: StaffDailyAbsence[],
  staffLeaveRecords: StaffLeaveRecord[]
): Pick<LoDayStaff, "teachers" | "office" | "janitors"> {
  const leaves = staffLeavesForDate(staffLeaveRecords, date);
  const daily = applyStaffLeavesToDaily(staffDailyFor(staffDailyAbsences, date), leaves, "");
  const groups: Record<LoStaffGroup, string[]> = {
    teachers: [],
    office: [],
    janitors: [],
  };
  const seen = new Set<string>();

  for (const leave of leaves) {
    const key = leave.staffId || leave.staffName;
    if (seen.has(key)) continue;
    seen.add(key);
    groups[classifyStaffName(leave.staffName)].push(formatLoStaffLeave(leave));
  }

  for (const row of STAFF_ABSENCE_ROWS) {
    for (const name of staffNamesForKind(members, daily, row.kind)) {
      const member = members.find((item) => item.name === name);
      const key = member?.id || name;
      if (seen.has(key)) continue;
      seen.add(key);
      groups[classifyStaffName(name)].push(`${name}(${row.label})`);
    }
  }

  return groups;
}

export function formatLoStaffLeave(leave: StaffLeaveRecord): string {
  const range =
    leave.endDate && leave.endDate !== leave.startDate
      ? `${slashDate(leave.startDate)}-${slashDate(leave.endDate)}`
      : "";
  if (leave.activity.trim()) {
    return `${leave.staffName}(${leave.activity.trim()}${range})`;
  }
  if (leave.note.trim() && !range) {
    return `${leave.staffName}(${leave.note.trim()})`;
  }
  if (range) {
    return `${leave.staffName}(${loCategoryShort(leave.category)}${range})`;
  }
  return `${leave.staffName}(${staffLeaveCategoryLabel(leave.category)})`;
}

function loCategoryShort(category: StaffLeaveCategory): string {
  switch (category) {
    case "sick":
      return "病";
    case "checkup":
      return "覆診";
    case "surgery":
      return "手術";
    case "funeral":
      return "白事";
    case "personal":
      return "事假";
    case "official":
      return "公假";
    default:
      return "其他";
  }
}

function classifyStaffName(name: string): LoStaffGroup {
  if (LO_JANITOR_NAMES.has(name)) return "janitors";
  if (LO_OFFICE_NAMES.has(name)) return "office";
  return "teachers";
}

function slashDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(day)}/${Number(month)}`;
}

function weekdayUtc(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekdayLabel(isoDate: string): string {
  return WEEKDAY_LABELS[weekdayUtc(isoDate)] ?? "";
}
