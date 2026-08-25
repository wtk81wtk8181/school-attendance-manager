import type {
  AcademicYear,
  AppState,
  DigestSettings,
} from "@/lib/types";
import { ROSTER_STUDENTS } from "@/data/roster-students";

export const SCHOOL_NAME = "萬鈞伯裘書院";
export const SCHOOL_NAME_EN = "Man Kwan Pak Kau College";
export const STORAGE_KEY = "hongtao-attendance-v9";
/** 升級此版本會清空舊缺席紀錄，並換上 Excel 匯入的正式學生名單 */
export const OPERATIONAL_DATA_VERSION = 3;

const academicYear: AcademicYear = {
  label: "2026-2027",
  start: "2026-09-01",
  end: "2027-07-10",
  schoolDays: 118,
};

const digestSettings: DigestSettings = {
  enabled: false,
  sendTime: "08:30",
  lastSentOn: "",
  lastSentSchoolDay: "",
};

export function createSeed(): AppState {
  return {
    academicYear,
    users: [
      {
        id: "u-office",
        name: "校務處",
        title: "校務處及學生部",
        role: "office",
      },
      {
        id: "u-teacher",
        name: "班主任",
        title: "班主任／任教老師",
        role: "homeroom",
      },
    ],
    currentUserId: null,
    selectedClassName: null,
    students: ROSTER_STUDENTS,
    absences: [],
    warnings: [],
    notifications: [],
    digestSettings,
    digestRecipients: [],
    digestLogs: [],
    clearedAttendance: [],
    removedRecipients: [],
    staffMembers: [],
    staffRemovals: [],
    staffDailyAbsences: [],
    staffLeaveRecords: [],
    staffLeaveRemovals: [],
    studentLeaveRecords: [],
    studentLeaveRemovals: [],
    auditLogs: [],
    dataVersion: OPERATIONAL_DATA_VERSION,
  };
}
