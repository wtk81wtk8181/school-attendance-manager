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

export function splitReason(reason: string): { option: string; other: string } {
  if ((ABSENCE_REASONS as readonly string[]).includes(reason) && reason !== "其他") {
    return { option: reason, other: "" };
  }
  if (!reason.trim()) return { option: "病假", other: "" };
  return { option: "其他", other: reason };
}

export function joinReason(option: string, other: string): string {
  return option === "其他" ? other.trim() || "其他" : option;
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
