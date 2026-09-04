import type { AbsenceRecord, EarlyPickup } from "@/lib/types";

export const ABSENCE_ECLASS_STATUSES = [
  "absent",
  "late",
  "leave",
  "half_absent",
  "early",
] as const;

export const ABSENCE_ADMIN_COLUMNS = [
  "id",
  "studentId",
  "date",
  "days",
  "eclassStatus",
  "reason",
  "calledBy",
  "calledAt",
  "documentType",
  "documentSubmitted",
  "reviewStatus",
  "reviewedBy",
  "reviewedAt",
  "notes",
  "source",
  "returnedAt",
  "earlyAt",
  "earlyPickup",
] as const;

export const EARLY_PICKUP_OPTIONS: Array<{ value: EarlyPickup; label: string }> = [
  { value: "father", label: "父親接送" },
  { value: "mother", label: "母親接送" },
  { value: "grandfather", label: "祖父接送" },
  { value: "grandmother", label: "祖母接送" },
  { value: "guardian", label: "監護人接送" },
  { value: "self", label: "自行離開" },
];

export function normalizeAbsenceDays(status: string): 0.5 | 1 {
  if (status === "half_absent" || status === "early") return 0.5;
  return 1;
}

export function normalizeAbsenceRecord(record: AbsenceRecord): AbsenceRecord {
  const status = ABSENCE_ECLASS_STATUSES.includes(
    record.eclassStatus as (typeof ABSENCE_ECLASS_STATUSES)[number]
  )
    ? record.eclassStatus
    : "absent";
  const defaultReason =
    status === "leave"
      ? "事假"
      : status === "late"
        ? "遲到"
        : status === "early"
          ? "早退"
          : "病假";
  const optionalString = (value: unknown) =>
    typeof value === "string" && value.trim() ? value : undefined;
  const pickup = EARLY_PICKUP_OPTIONS.some((item) => item.value === record.earlyPickup)
    ? record.earlyPickup
    : undefined;

  return {
    ...record,
    eclassStatus: status,
    days: normalizeAbsenceDays(status),
    reason: typeof record.reason === "string" ? record.reason : defaultReason,
    calledBy: optionalString(record.calledBy),
    calledAt: optionalString(record.calledAt),
    documentType: ["doctor", "parent", "none"].includes(record.documentType)
      ? record.documentType
      : "none",
    documentSubmitted: record.documentSubmitted === true,
    reviewStatus: ["pending", "approved", "rejected"].includes(record.reviewStatus)
      ? record.reviewStatus
      : "pending",
    source: ["eclass", "office"].includes(record.source) ? record.source : "office",
    returnedAt: optionalString(record.returnedAt),
    earlyAt: optionalString(record.earlyAt),
    earlyPickup: pickup,
  };
}

export function earlyPickupLabel(value: EarlyPickup | undefined): string {
  return EARLY_PICKUP_OPTIONS.find((item) => item.value === value)?.label ?? "—";
}

export function isGenericAttendanceReason(reason: string | undefined): boolean {
  const value = reason?.trim() ?? "";
  return !value || ["缺席", "遲到", "事假", "半日缺席", "早退", "請假"].includes(value);
}

function cleanedReason(reason: string): string {
  return reason.trim().replace(/^因/, "");
}

export function formatHalfAbsentReportLine(
  name: string,
  reason: string,
  returnedAt: string,
  calledBy?: string,
  calledAt?: string
): string {
  const body = cleanedReason(reason);
  const cause =
    !body || isGenericAttendanceReason(body)
      ? "缺席"
      : body.endsWith("缺席")
        ? `因${body}`
        : `因${body}缺席`;
  const caller =
    calledBy?.trim() && calledBy !== "尚未致電" ? calledBy : "";
  const callTime = calledAt?.trim() && calledAt !== "—" ? calledAt : "";
  const callSuffix = caller ? `(${caller})${callTime}` : callTime;
  const time = returnedAt.trim() || "—";
  return `${name}${cause}${callSuffix}/(已於${time}回校)`;
}

export function formatEarlyLeaveReportLine(
  name: string,
  reason: string,
  earlyAt: string,
  pickup: EarlyPickup | undefined
): string {
  const body = cleanedReason(reason);
  const cause = !body || isGenericAttendanceReason(body) ? "" : `因${body}`;
  const time = earlyAt.trim() || "—";
  return `${name}${cause}於${time}早退（${earlyPickupLabel(pickup)}）`;
}

export function formatAbsenceRecordLine(
  name: string,
  record: Pick<
    AbsenceRecord,
    "eclassStatus" | "reason" | "returnedAt" | "earlyAt" | "earlyPickup" | "calledBy" | "calledAt"
  >
): string {
  if (record.eclassStatus === "half_absent") {
    return formatHalfAbsentReportLine(
      name,
      record.reason,
      record.returnedAt ?? "",
      record.calledBy,
      record.calledAt
    );
  }
  if (record.eclassStatus === "early") {
    return formatEarlyLeaveReportLine(
      name,
      record.reason,
      record.earlyAt ?? "",
      record.earlyPickup
    );
  }
  return record.reason;
}
