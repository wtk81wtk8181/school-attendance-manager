import type { ContactMethod } from "@/lib/types";

export const ABSENCE_REASONS = [
  "病假",
  "覆診",
  "事假",
  "身體不適",
  "家庭事務",
  "流感",
  "牙科治療",
  "無故缺席",
  "其他",
] as const;

export const CONTACT_METHODS = [
  { value: "none", label: "尚未聯絡" },
  { value: "call", label: "致電" },
  { value: "app", label: "APP申請" },
] as const;

export type ContactMethodOption = (typeof CONTACT_METHODS)[number]["value"];

export const CALLER_RELATIONS = [
  "尚未致電",
  "父親",
  "母親",
  "婆婆",
  "嫲嫲",
  "爺爺",
  "公公",
  "其他",
] as const;

const RELATION_PREFIXES = ["父親", "母親", "婆婆", "嫲嫲", "爺爺", "公公"] as const;

export function splitReason(reason: string): { option: string; extra: string } {
  const trimmed = reason.trim();
  const sick = trimmed.match(/^病假[（(](.+)[）)]$/);
  if (sick) return { option: "病假", extra: sick[1].trim() };
  if (trimmed === "病假") return { option: "病假", extra: "" };
  if ((ABSENCE_REASONS as readonly string[]).includes(trimmed) && trimmed !== "其他") {
    return { option: trimmed, extra: "" };
  }
  if (!trimmed) return { option: "病假", extra: "" };
  return { option: "其他", extra: trimmed };
}

export function joinReason(option: string, extra: string): string {
  const detail = extra.trim();
  if (option === "病假") return detail ? `病假（${detail}）` : "病假";
  if (option === "其他") return detail || "其他";
  return option;
}

export function splitCaller(calledBy: string): { relation: string; name: string } {
  const value = calledBy.trim();
  if (!value || value === "尚未致電") return { relation: "尚未致電", name: "" };
  if (value === "其他") return { relation: "其他", name: "" };
  for (const relation of RELATION_PREFIXES) {
    if (value === relation || value.startsWith(relation)) {
      return { relation, name: value.slice(relation.length).trim() };
    }
  }
  return { relation: "其他", name: value };
}

export function joinCaller(relation: string, name: string): string {
  if (relation === "尚未致電") return "";
  if (relation === "其他") return name.trim() || "其他";
  return `${relation}${name.trim()}`;
}

export function inferContactMethod(
  calledBy?: string,
  contactMethod?: ContactMethod
): ContactMethod {
  if (contactMethod === "app" || contactMethod === "call" || contactMethod === "none") {
    return contactMethod;
  }
  const caller = calledBy?.trim();
  if (caller && caller !== "尚未致電") return "call";
  return "none";
}

export function formatContactSuffix(
  calledBy?: string,
  calledAt?: string,
  contactMethod?: ContactMethod,
  contactedOn?: string
): string {
  const method = inferContactMethod(calledBy, contactMethod);
  const caller =
    calledBy?.trim() && calledBy !== "尚未致電" ? calledBy.trim() : "";
  const time = calledAt?.trim() && calledAt !== "—" ? calledAt.trim() : "";
  const dateLabel = formatContactDate(contactedOn);
  if (method === "app") {
    const when = [dateLabel, time].filter(Boolean).join(" ");
    if (caller && when) return `（APP申請：${caller} ${when}）`;
    if (caller) return `（APP申請：${caller}）`;
    if (when) return `（APP申請 ${when}）`;
    return "（APP申請）";
  }
  if (method === "call") {
    if (caller && time) return `(${caller})${time}`;
    if (caller) return `(${caller})`;
    return time;
  }
  return "";
}

function formatContactDate(iso?: string): string {
  const value = iso?.trim();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [, month, day] = value.split("-");
  return `${Number(day)}/${Number(month)}`;
}
