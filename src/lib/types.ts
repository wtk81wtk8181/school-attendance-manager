export type Role = "office" | "homeroom";

export type FormLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type EclassStatus = "present" | "absent" | "late" | "leave";

export type DayAttendance = Exclude<EclassStatus, never>;

export type AbsenceSource = "eclass" | "office";

export type DocumentType = "doctor" | "parent" | "none";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type WarningType = "half_limit" | "over_limit" | "frequent";

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
}

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

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
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
