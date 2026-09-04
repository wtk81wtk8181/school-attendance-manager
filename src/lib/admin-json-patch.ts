import {
  ABSENCE_ADMIN_COLUMNS,
  ABSENCE_ECLASS_STATUSES,
  EARLY_PICKUP_OPTIONS,
  normalizeAbsenceRecord,
} from "@/lib/attendance-extras";
import type { AbsenceRecord, AppState } from "@/lib/types";

/** 必須與伺服器 REPLACEABLE_ARRAY_SECTIONS 一致，否則雲端會略過整段覆寫。 */
export const ADMIN_JSON_SECTIONS = [
  "students",
  "absences",
  "warnings",
  "notifications",
  "digestRecipients",
  "digestLogs",
  "staffMembers",
  "staffDailyAbsences",
  "staffLeaveRecords",
  "studentLeaveRecords",
  "hiddenStudents",
] as const;

export type AdminJsonSection = (typeof ADMIN_JSON_SECTIONS)[number];

const SECTION_SET = new Set<string>(ADMIN_JSON_SECTIONS);

export interface AdminJsonPatchPreview {
  sections: Partial<Record<AdminJsonSection, unknown[]>>;
  summary: Array<{
    section: AdminJsonSection;
    label: string;
    nextCount: number;
    currentCount: number;
  }>;
}

export const ADMIN_SECTION_LABELS: Record<AdminJsonSection, string> = {
  students: "學生名單",
  absences: "缺席紀錄",
  warnings: "警告信",
  notifications: "通知",
  digestRecipients: "電郵收件人",
  digestLogs: "電郵寄出紀錄",
  staffMembers: "教職員名單",
  staffDailyAbsences: "教職員每日缺席",
  staffLeaveRecords: "教職員提早請假",
  studentLeaveRecords: "學生預先請假",
  hiddenStudents: "連續缺席隱藏學生",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseAdminJsonPatch(raw: string):
  | { ok: true; preview: AdminJsonPatchPreview }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "請貼上 JSON 內容。" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "JSON 格式不正確，請檢查括號、引號及逗號。" };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: "最外層必須是 JSON 物件。" };
  }

  const sections: Partial<Record<AdminJsonSection, unknown[]>> = {};

  const hasSingleFormat = "section" in parsed && "rows" in parsed;
  const otherSectionKeys = Object.keys(parsed).filter(
    (key) => key !== "section" && key !== "rows" && SECTION_SET.has(key)
  );
  if (hasSingleFormat && otherSectionKeys.length > 0) {
    return {
      ok: false,
      error: "請只用一種格式：要用 section／rows，或直接用資料表名稱作為欄位，不要混用。",
    };
  }

  if (hasSingleFormat) {
    const section = String(parsed.section ?? "").trim();
    if (!SECTION_SET.has(section)) {
      return { ok: false, error: `不支援的資料表：${section || "（空白）"}` };
    }
    if (!Array.isArray(parsed.rows)) {
      return { ok: false, error: "rows 必須是陣列。" };
    }
    sections[section as AdminJsonSection] = parsed.rows;
  } else {
    for (const [key, value] of Object.entries(parsed)) {
      if (!SECTION_SET.has(key)) {
        return {
          ok: false,
          error: `不支援的欄位「${key}」。只允許：${ADMIN_JSON_SECTIONS.join("、")}`,
        };
      }
      if (!Array.isArray(value)) {
        return { ok: false, error: `「${key}」必須是陣列。` };
      }
      sections[key as AdminJsonSection] = value;
    }
  }

  if (Object.keys(sections).length === 0) {
    return { ok: false, error: "沒有可套用的資料表。" };
  }

  for (const [section, rows] of Object.entries(sections) as Array<
    [AdminJsonSection, unknown[]]
  >) {
    const error = validateAdminSectionRows(section, rows);
    if (error) return { ok: false, error };
  }

  return {
    ok: true,
    preview: {
      sections,
      summary: (Object.keys(sections) as AdminJsonSection[]).map((section) => ({
        section,
        label: ADMIN_SECTION_LABELS[section],
        nextCount: sections[section]?.length ?? 0,
        currentCount: 0,
      })),
    },
  };
}

export function attachCurrentCounts(
  preview: AdminJsonPatchPreview,
  state: AppState
): AdminJsonPatchPreview {
  return {
    ...preview,
    summary: preview.summary.map((item) => {
      const current = state[item.section];
      return {
        ...item,
        currentCount: Array.isArray(current) ? current.length : 0,
      };
    }),
  };
}

export function validateAdminSectionRows(
  section: AdminJsonSection,
  rows: unknown[]
): string | null {
  if (!rows.every((row) => isObject(row))) {
    return `${ADMIN_SECTION_LABELS[section]} 包含無效資料列（每列必須是物件）。`;
  }

  if (section === "staffDailyAbsences") {
    const dates = rows.map((row) => String(row.date ?? ""));
    if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return "教職員每日缺席包含無效日期（須為 YYYY-MM-DD）。";
    }
    if (new Set(dates).size !== dates.length) {
      return "教職員每日缺席包含重複日期。";
    }
    return null;
  }

  const ids = rows.map((row) => String(row.id ?? "").trim());
  if (ids.some((id) => !id)) {
    return `${ADMIN_SECTION_LABELS[section]} 包含缺少 id 的資料列。`;
  }
  if (new Set(ids).size !== ids.length) {
    return `${ADMIN_SECTION_LABELS[section]} 包含重複 id。`;
  }

  if (section === "students") {
    const studentNumbers = rows.map((row) => String(row.studentNo ?? "").trim());
    if (studentNumbers.some((studentNo) => !studentNo)) {
      return "學生名單包含缺少學號的資料列。";
    }
    if (new Set(studentNumbers).size !== studentNumbers.length) {
      return "學生名單包含重複學號。";
    }
  }

  if (section === "absences") {
    const allowedStatus = new Set<string>(ABSENCE_ECLASS_STATUSES);
    const allowedPickup = new Set<string>(EARLY_PICKUP_OPTIONS.map((item) => item.value));
    const allowedDocumentTypes = new Set(["doctor", "parent", "none"]);
    const allowedReviewStatuses = new Set(["pending", "approved", "rejected"]);
    const allowedSources = new Set(["eclass", "office"]);
    const pairs = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const studentId = String(row.studentId ?? "").trim();
      const date = String(row.date ?? "").trim();
      const status = String(row.eclassStatus ?? "").trim();
      const pickup = String(row.earlyPickup ?? "").trim();
      const rowLabel = `缺席紀錄第 ${index + 1} 列`;
      if (!studentId) {
        return `${rowLabel}缺少 studentId。`;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return `${rowLabel}日期無效（須為 YYYY-MM-DD）。`;
      }
      if (!allowedStatus.has(status)) {
        return `${rowLabel}的 eclassStatus 無效。只允許：${ABSENCE_ECLASS_STATUSES.join("、")}。`;
      }
      if (pickup && !allowedPickup.has(pickup)) {
        return `${rowLabel}的 earlyPickup 無效。`;
      }
      if (typeof row.reason !== "string") {
        return `${rowLabel}的 reason 必須是文字。`;
      }
      for (const field of [
        "calledBy",
        "calledAt",
        "contactMethod",
        "contactedOn",
        "reviewedBy",
        "reviewedAt",
        "notes",
        "returnedAt",
        "earlyAt",
      ] as const) {
        if (row[field] !== undefined && row[field] !== null && typeof row[field] !== "string") {
          return `${rowLabel}的 ${field} 必須是文字。`;
        }
      }
      if (row.contactMethod !== undefined && row.contactMethod !== null && row.contactMethod !== "") {
        if (!["none", "call", "app"].includes(String(row.contactMethod))) {
          return `${rowLabel}的 contactMethod 無效。`;
        }
      }
      if (!allowedDocumentTypes.has(String(row.documentType ?? ""))) {
        return `${rowLabel}的 documentType 無效。`;
      }
      if (typeof row.documentSubmitted !== "boolean") {
        return `${rowLabel}的 documentSubmitted 必須是 true 或 false。`;
      }
      if (!allowedReviewStatuses.has(String(row.reviewStatus ?? ""))) {
        return `${rowLabel}的 reviewStatus 無效。`;
      }
      if (!allowedSources.has(String(row.source ?? ""))) {
        return `${rowLabel}的 source 無效。`;
      }
      const pair = `${studentId}:${date}`;
      if (pairs.has(pair)) {
        return `缺席紀錄包含重複的學生與日期：${pair}`;
      }
      pairs.add(pair);
    }
  }

  return null;
}

function absenceKey(record: { studentId?: unknown; date?: unknown }): string {
  return `${String(record.studentId ?? "")}:${String(record.date ?? "")}`;
}

function asRecordRows(rows: unknown[]): Array<Record<string, unknown>> {
  return rows.filter(isObject);
}

/** 整段覆寫資料表，並為刪除列寫入 tombstone，避免之後合併時被舊資料救回。 */
export function applyAdminSectionRows(
  prev: AppState,
  section: AdminJsonSection,
  rows: unknown[],
  removedAt: string
): AppState {
  const nextRows = asRecordRows(rows);
  const nextIds = new Set(nextRows.map((row) => String(row.id ?? "").trim()).filter(Boolean));

  if (section === "absences") {
    const nextKeys = new Set(nextRows.map(absenceKey));
    const extraClears = (prev.absences ?? [])
      .filter((item) => !nextKeys.has(absenceKey(item)))
      .map((item) => ({
        studentId: item.studentId,
        date: item.date,
        clearedAt: removedAt,
      }));
    return {
      ...prev,
      absences: nextRows.map((row) =>
        normalizeAbsenceRecord(row as unknown as AbsenceRecord)
      ),
      clearedAttendance: [...extraClears, ...(prev.clearedAttendance ?? [])],
    };
  }

  if (section === "digestRecipients") {
    const extraRemovals = (prev.digestRecipients ?? [])
      .filter((item) => !nextIds.has(item.id))
      .map((item) => ({
        id: item.id,
        email: item.email,
        removedAt,
      }));
    return {
      ...prev,
      digestRecipients: nextRows as unknown as AppState["digestRecipients"],
      removedRecipients: [
        ...extraRemovals,
        ...(prev.removedRecipients ?? []).filter(
          (item) =>
            !extraRemovals.some(
              (row) =>
                row.id === item.id ||
                row.email.trim().toLowerCase() === item.email.trim().toLowerCase()
            )
        ),
      ],
    };
  }

  if (section === "staffMembers") {
    const extraRemovals = (prev.staffMembers ?? [])
      .filter((item) => !nextIds.has(item.id))
      .map((item) => ({ id: item.id, removedAt }));
    return {
      ...prev,
      staffMembers: nextRows as unknown as AppState["staffMembers"],
      staffRemovals: [
        ...extraRemovals,
        ...(prev.staffRemovals ?? []).filter(
          (item) => !extraRemovals.some((row) => row.id === item.id)
        ),
      ],
    };
  }

  if (section === "staffLeaveRecords") {
    const extraRemovals = (prev.staffLeaveRecords ?? [])
      .filter((item) => !nextIds.has(item.id))
      .map((item) => ({ id: item.id, removedAt }));
    return {
      ...prev,
      staffLeaveRecords: nextRows as unknown as AppState["staffLeaveRecords"],
      staffLeaveRemovals: [
        ...extraRemovals,
        ...(prev.staffLeaveRemovals ?? []).filter(
          (item) => !extraRemovals.some((row) => row.id === item.id)
        ),
      ],
    };
  }

  if (section === "studentLeaveRecords") {
    const extraRemovals = (prev.studentLeaveRecords ?? [])
      .filter((item) => !nextIds.has(item.id))
      .map((item) => ({ id: item.id, removedAt }));
    return {
      ...prev,
      studentLeaveRecords: nextRows as unknown as AppState["studentLeaveRecords"],
      studentLeaveRemovals: [
        ...extraRemovals,
        ...(prev.studentLeaveRemovals ?? []).filter(
          (item) => !extraRemovals.some((row) => row.id === item.id)
        ),
      ],
    };
  }

  if (section === "hiddenStudents") {
    const extraRemovals = (prev.hiddenStudents ?? [])
      .filter((item) => !nextIds.has(item.id) && !nextIds.has(item.studentId))
      .map((item) => ({ id: item.studentId, removedAt }));
    return {
      ...prev,
      hiddenStudents: nextRows as unknown as AppState["hiddenStudents"],
      hiddenStudentRemovals: [
        ...extraRemovals,
        ...(prev.hiddenStudentRemovals ?? []).filter(
          (item) => !extraRemovals.some((row) => row.id === item.id)
        ),
      ],
    };
  }

  return {
    ...prev,
    [section]: nextRows,
  } as AppState;
}

export function applyAdminJsonSections(
  prev: AppState,
  sections: Partial<Record<AdminJsonSection, unknown[]>>,
  removedAt: string
): AppState {
  let next = prev;
  for (const [section, rows] of Object.entries(sections) as Array<
    [AdminJsonSection, unknown[]]
  >) {
    next = applyAdminSectionRows(next, section, rows, removedAt);
  }
  return next;
}

export function collectAdminColumns(
  section: string,
  rows: Array<Record<string, unknown>>
): string[] {
  const keys = new Set<string>();
  const preferred =
    section === "absences" ? (ABSENCE_ADMIN_COLUMNS as readonly string[]) : [];
  for (const key of preferred) keys.add(key);
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  const extras = [...keys].filter((key) => !preferred.includes(key));
  return [...preferred, ...extras];
}

export function exampleAdminJson(section: AdminJsonSection = "students"): string {
  if (section === "students") {
    return JSON.stringify(
      {
        section: "students",
        rows: [
          {
            id: "s-1a-01",
            studentNo: "2501001",
            name: "示例學生",
            nameEn: "EXAMPLE STUDENT",
            form: 1,
            className: "1A",
            homeroomTeacherId: "u-1a",
            homeroomTeacherName: "黃轉鳳、郭家銘",
          },
        ],
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      section,
      rows: [],
    },
    null,
    2
  );
}
