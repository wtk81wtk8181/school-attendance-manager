import type { AbsenceRecord, EarlyPickup } from "@/lib/types";

export const EARLY_PICKUP_OPTIONS: Array<{ value: EarlyPickup; label: string }> = [
  { value: "father", label: "父親接送" },
  { value: "mother", label: "母親接送" },
  { value: "grandfather", label: "祖父接送" },
  { value: "grandmother", label: "祖母接送" },
  { value: "guardian", label: "監護人接送" },
  { value: "self", label: "自行離開" },
];

export function earlyPickupLabel(value: EarlyPickup | undefined): string {
  return EARLY_PICKUP_OPTIONS.find((item) => item.value === value)?.label ?? "自行離開";
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
  returnedAt: string
): string {
  const body = cleanedReason(reason);
  const cause =
    !body || isGenericAttendanceReason(body)
      ? "缺席"
      : body.endsWith("缺席")
        ? `因${body}`
        : `因${body}缺席`;
  const time = returnedAt.trim() || "—";
  return `${name}${cause}/(已於${time}回校)`;
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
    "eclassStatus" | "reason" | "returnedAt" | "earlyAt" | "earlyPickup"
  >
): string {
  if (record.eclassStatus === "half_absent") {
    return formatHalfAbsentReportLine(name, record.reason, record.returnedAt ?? "");
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
