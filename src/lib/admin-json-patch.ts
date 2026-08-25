import type { AppState } from "@/lib/types";

export const ADMIN_JSON_SECTIONS = [
  "students",
  "absences",
  "warnings",
  "notifications",
  "clearedAttendance",
  "staffMembers",
  "staffDailyAbsences",
  "staffLeaveRecords",
  "studentLeaveRecords",
  "digestRecipients",
  "digestLogs",
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
  clearedAttendance: "已清除出席",
  staffMembers: "教職員名單",
  staffDailyAbsences: "教職員每日缺席",
  staffLeaveRecords: "教職員提早請假",
  studentLeaveRecords: "學生預先請假",
  digestRecipients: "電郵收件人",
  digestLogs: "電郵寄出紀錄",
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

  if ("section" in parsed && "rows" in parsed) {
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

  return null;
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
