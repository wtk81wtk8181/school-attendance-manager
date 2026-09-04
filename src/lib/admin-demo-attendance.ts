import { EARLY_PICKUP_OPTIONS, normalizeAbsenceDays } from "@/lib/attendance-extras";
import { allClassNames } from "@/lib/roster";
import { emptyStaffDaily, withToggledStaff } from "@/lib/staff";
import type {
  AbsenceRecord,
  AppState,
  DayAttendance,
  EarlyPickup,
  StaffAbsenceKind,
  StaffDailyAbsence,
  StaffMember,
  Student,
} from "@/lib/types";

const STUDENT_STATUSES = ["absent", "late", "early", "half_absent"] as const;
type DemoStudentStatus = (typeof STUDENT_STATUSES)[number];

const STAFF_KINDS: StaffAbsenceKind[] = ["sick", "personal", "official", "early"];

const SAMPLE_CALLERS = ["母親", "父親", "祖母", "監護人"];
const SAMPLE_CALL_TIMES = ["07:52", "08:05", "08:12", "08:18", "08:27", "08:41", "09:08"];
const ABSENT_REASONS = ["病假", "感冒", "頭痛", "發燒", "肚痛", "覆診"];
const LATE_REASONS = ["遲到", "交通擠塞"];
const EARLY_REASONS = ["覆診", "身體不適", "家事"];
const HALF_REASONS = ["覆診", "身體不適", "不適"];
const RETURN_TIMES = ["12:45", "13:02", "13:15", "13:30"];
const EARLY_TIMES = ["10:30", "11:00", "11:45", "12:15", "13:15"];

export interface AdminDemoAttendanceOptions {
  perClass?: number;
  staffCount?: number;
}

export interface AdminDemoAttendanceResult {
  absences: AbsenceRecord[];
  staffDaily: StaffDailyAbsence;
  summary: {
    classes: number;
    studentRecords: number;
    staffCount: number;
    perClass: number;
  };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function statusesForClass(count: number): DemoStudentStatus[] {
  if (count <= 0) return [];
  const base = [...STUDENT_STATUSES];
  const extra: DemoStudentStatus[] = [];
  while (base.length + extra.length < count) {
    extra.push(pick(STUDENT_STATUSES));
  }
  return shuffle([...base, ...extra]).slice(0, count);
}

function buildStudentRecord(
  student: Student,
  schoolDay: string,
  status: DemoStudentStatus,
  index: number
): AbsenceRecord {
  const caller = pick(SAMPLE_CALLERS);
  const calledAt = pick(SAMPLE_CALL_TIMES);
  const base: AbsenceRecord = {
    id: `demo-${schoolDay}-${student.id}`,
    studentId: student.id,
    date: schoolDay,
    days: normalizeAbsenceDays(status),
    eclassStatus: status as Exclude<DayAttendance, "present">,
    reason:
      status === "absent"
        ? pick(ABSENT_REASONS)
        : status === "late"
          ? pick(LATE_REASONS)
          : status === "early"
            ? pick(EARLY_REASONS)
            : pick(HALF_REASONS),
    calledBy: status === "late" ? undefined : caller,
    calledAt: status === "late" ? undefined : calledAt,
    documentType: "none",
    documentSubmitted: false,
    reviewStatus: "pending",
    source: "office",
    notes: `後台示範資料 #${index + 1}`,
  };

  if (status === "half_absent") {
    return { ...base, returnedAt: pick(RETURN_TIMES) };
  }
  if (status === "early") {
    const pickup = pick(EARLY_PICKUP_OPTIONS).value as EarlyPickup;
    return { ...base, earlyAt: pick(EARLY_TIMES), earlyPickup: pickup };
  }
  return base;
}

export function buildAdminDemoAttendance(
  students: Student[],
  staffMembers: StaffMember[],
  schoolDay: string,
  updatedAt: string,
  options: AdminDemoAttendanceOptions = {}
): AdminDemoAttendanceResult {
  const perClass = options.perClass ?? 10;
  const staffCount = Math.min(options.staffCount ?? 7, staffMembers.length);
  const absences: AbsenceRecord[] = [];

  for (const className of allClassNames()) {
    const classStudents = shuffle(students.filter((item) => item.className === className)).slice(
      0,
      perClass
    );
    const statuses = statusesForClass(classStudents.length);
    classStudents.forEach((student, index) => {
      absences.push(
        buildStudentRecord(student, schoolDay, statuses[index] ?? pick(STUDENT_STATUSES), index)
      );
    });
  }

  let staffDaily = emptyStaffDaily(schoolDay, updatedAt);
  for (const staff of shuffle(staffMembers).slice(0, staffCount)) {
    staffDaily = withToggledStaff(staffDaily, pick(STAFF_KINDS), staff.id, true, updatedAt);
  }

  return {
    absences,
    staffDaily,
    summary: {
      classes: allClassNames().length,
      studentRecords: absences.length,
      staffCount,
      perClass,
    },
  };
}

export function mergeDemoAttendanceForDay(
  prev: AppState,
  schoolDay: string,
  demo: AdminDemoAttendanceResult,
  clearedAt: string
): Pick<AppState, "absences" | "staffDailyAbsences" | "clearedAttendance"> {
  const removedOnDay = (prev.absences ?? []).filter((item) => item.date === schoolDay);
  const clearedAttendance = [
    ...removedOnDay.map((item) => ({
      studentId: item.studentId,
      date: item.date,
      clearedAt,
    })),
    ...(prev.clearedAttendance ?? []).filter(
      (item) =>
        item.date !== schoolDay ||
        !removedOnDay.some((removed) => removed.studentId === item.studentId)
    ),
  ];

  return {
    absences: [
      ...(prev.absences ?? []).filter((item) => item.date !== schoolDay),
      ...demo.absences,
    ],
    staffDailyAbsences: [
      ...(prev.staffDailyAbsences ?? []).filter((item) => item.date !== schoolDay),
      demo.staffDaily,
    ],
    clearedAttendance,
  };
}
