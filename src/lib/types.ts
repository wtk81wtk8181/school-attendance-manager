import type { AppearanceIssueCategoryId } from "@/lib/appearance-categories";

export type Role = "office" | "homeroom";

export type FormLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type EclassStatus = "present" | "absent" | "late" | "leave" | "half_absent" | "early";

export type DayAttendance = Exclude<EclassStatus, never>;

export type AbsenceSource = "eclass" | "office";

export type DocumentType = "doctor" | "parent" | "none";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type WarningType =
  | "half_limit"
  | "over_limit"
  | "frequent_absence"
  | "frequent_late"
  /** @deprecated 舊版合併缺席／遲到，新信只會分開發出 */
  | "frequent";

export type WarningStatus = "issued" | "followed_up" | "archived";

export interface User {
  id: string;
  name: string;
  title: string;
  role: Role;
  className?: string;
}

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  nameEn: string;
  form: FormLevel;
  className: string;
  homeroomTeacherId: string;
  homeroomTeacherName: string;
  /** 插班生效日 YYYY-MM-DD，當日報告會列入新生插班名單 */
  enrolledOn?: string;
}

export type EarlyPickup =
  | "father"
  | "mother"
  | "grandfather"
  | "grandmother"
  | "guardian"
  | "self";

export interface AbsenceRecord {
  id: string;
  studentId: string;
  date: string;
  days: 0.5 | 1;
  eclassStatus: Exclude<EclassStatus, "present">;
  reason: string;
  calledBy?: string;
  calledAt?: string;
  documentType: DocumentType;
  documentSubmitted: boolean;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  source: AbsenceSource;
  /** 半日缺席回校時間，例如 13:02 */
  returnedAt?: string;
  /** 早退時間，例如 13:15 */
  earlyAt?: string;
  earlyPickup?: EarlyPickup;
}

export interface WarningLetter {
  id: string;
  studentId: string;
  type: WarningType;
  issuedAt: string;
  triggerDays: number;
  limitDays: number;
  status: WarningStatus;
  followedUpBy?: string;
  followedUpAt?: string;
  followUpNotes?: string;
}

export interface NotificationItem {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  kind: "warning" | "review" | "digest";
  studentId?: string;
  warningId?: string;
  read: boolean;
}

export type DigestTrigger = "auto" | "manual";

export interface DigestRecipient {
  id: string;
  name: string;
  email: string;
  title: string;
  className?: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface AttendanceClear {
  studentId: string;
  date: string;
  clearedAt: string;
}

export interface RecipientRemoval {
  id: string;
  email: string;
  removedAt: string;
}

export type StaffAbsenceKind = "sick" | "personal" | "official" | "early";

export interface StaffMember {
  id: string;
  name: string;
  updatedAt: string;
}

export interface StaffRemoval {
  id: string;
  removedAt: string;
}

export interface StaffDailyAbsence {
  date: string;
  sickIds: string[];
  personalIds: string[];
  officialIds: string[];
  earlyIds: string[];
  selectionChanges?: Record<
    string,
    { kind: StaffAbsenceKind | null; updatedAt: string }
  >;
  updatedAt: string;
}

export type StaffLeaveCategory = "checkup" | "surgery" | "funeral" | "personal" | "official" | "sick" | "other";

export interface StaffLeaveRecord {
  id: string;
  staffId: string;
  staffName: string;
  category: StaffLeaveCategory;
  startDate: string;
  endDate: string;
  note: string;
  /** 事假連結的外出活動／比賽名稱 */
  activity: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffLeaveRemoval {
  id: string;
  removedAt: string;
}

export type StudentLeaveCategory = StaffLeaveCategory;

export interface StudentLeaveRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  category: StudentLeaveCategory;
  status: "leave" | "absent";
  startDate: string;
  endDate: string;
  reason: string;
  activity: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentLeaveRemoval {
  id: string;
  removedAt: string;
}

export interface HiddenStudent {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  hiddenAt: string;
  lastAbsentDate: string;
  streak: number;
}

export interface HiddenStudentRemoval {
  id: string;
  removedAt: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
}

/** 該日上課日儀容問題；未標記或 categories 為空視為儀容正常 */
export interface AppearanceIssue {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  /** YYYY-MM-DD 上課日 */
  date?: string;
  /** 儀容問題類別；空陣列表示當日無問題 */
  categories?: AppearanceIssueCategoryId[];
  updatedAt: string;
  /** @deprecated 舊版每月標記，僅作向後相容 */
  yearMonth?: string;
}

export interface AppearanceIssueRemoval {
  id: string;
  removedAt: string;
}

export interface DigestSettings {
  enabled: boolean;
  sendTime: string;
  lastSentOn: string;
  lastSentSchoolDay: string;
  updatedAt?: string;
}

export interface DigestLog {
  id: string;
  createdAt: string;
  schoolDay: string;
  trigger: DigestTrigger;
  filename: string;
  recipientEmails: string[];
  classCount: number;
  rowCount: number;
  mode: "smtp" | "export";
  note: string;
}

export interface AcademicYear {
  label: string;
  start: string;
  end: string;
  schoolDays: number;
}

export interface AppState {
  academicYear: AcademicYear;
  users: User[];
  currentUserId: string | null;
  selectedClassName: string | null;
  students: Student[];
  absences: AbsenceRecord[];
  warnings: WarningLetter[];
  notifications: NotificationItem[];
  digestSettings: DigestSettings;
  digestRecipients: DigestRecipient[];
  digestLogs: DigestLog[];
  clearedAttendance: AttendanceClear[];
  removedRecipients: RecipientRemoval[];
  staffMembers: StaffMember[];
  staffRemovals: StaffRemoval[];
  staffDailyAbsences: StaffDailyAbsence[];
  staffLeaveRecords: StaffLeaveRecord[];
  staffLeaveRemovals: StaffLeaveRemoval[];
  studentLeaveRecords: StudentLeaveRecord[];
  studentLeaveRemovals: StudentLeaveRemoval[];
  hiddenStudents: HiddenStudent[];
  hiddenStudentRemovals: HiddenStudentRemoval[];
  appearanceIssues: AppearanceIssue[];
  appearanceIssueRemovals: AppearanceIssueRemoval[];
  /** 後台留言版備註（全體共用） */
  adminMemo: string;
  auditLogs: AuditLog[];
  dataVersion: number;
}

export interface StudentStats {
  student: Student;
  totalAbsences: number;
  countedDays: number;
  approvedLeaveDays: number;
  pendingDays: number;
  lateCount: number;
  frequentCount: number;
  attendanceRate: number;
  limit: number;
  warningThreshold: number;
  level: "ok" | "warning" | "over";
}
