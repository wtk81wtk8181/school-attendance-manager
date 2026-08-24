import { generatedClassStudents } from "@/lib/roster";
import type {
  AbsenceRecord,
  AcademicYear,
  AppState,
  DigestLog,
  DigestRecipient,
  DigestSettings,
  NotificationItem,
  Student,
  SyncLog,
  User,
  WarningLetter,
} from "@/lib/types";

export const SCHOOL_NAME = "萬鈞伯裘書院";
export const SCHOOL_NAME_EN = "Man Kwan Pak Kau College";
export const STORAGE_KEY = "hongtao-attendance-v4";

const academicYear: AcademicYear = {
  label: "2026-2027",
  start: "2025-09-01",
  end: "2026-07-10",
  schoolDays: 118,
};

const users: User[] = [
  {
    id: "u-office",
    name: "負責職員",
    title: "校務處及學生部",
    role: "office",
  },
  {
    id: "u-teacher",
    name: "老師",
    title: "班主任／任教老師",
    role: "homeroom",
  },
];

const students: Student[] = [
  s("s1a01", "2501001", "陳梓軒", "Chan Tsz Hin", 1, "1A", "u-1a", "李志強"),
  s("s1a02", "2501002", "林凱晴", "Lam Hoi Ching", 1, "1A", "u-1a", "李志強"),
  s("s1a03", "2501003", "黃子諾", "Wong Tsz Nok", 1, "1A", "u-1a", "李志強"),
  s("s1a04", "2501004", "張嘉怡", "Cheung Ka Yi", 1, "1A", "u-1a", "李志強"),
  s("s1a05", "2501005", "吳浩然", "Ng Ho Yin", 1, "1A", "u-1a", "李志強"),
  s("s1a06", "2501006", "周詠琳", "Chow Wing Lam", 1, "1A", "u-1a", "李志強"),
  s("s1a07", "2501007", "鄭曉彤", "Cheng Hiu Tung", 1, "1A", "u-1a", "李志強"),
  s("s1a08", "2501008", "馮俊宇", "Fung Chun Yu", 1, "1A", "u-1a", "李志強"),
  s("s3b01", "2302001", "劉芷晴", "Lau Tsz Ching", 3, "3B", "u-3b", "周啟明"),
  s("s3b02", "2302002", "何俊傑", "Ho Chun Kit", 3, "3B", "u-3b", "周啟明"),
  s("s3b03", "2302003", "葉芯怡", "Yip Sum Yi", 3, "3B", "u-3b", "周啟明"),
  s("s3b04", "2302004", "蔡銘軒", "Choi Ming Hin", 3, "3B", "u-3b", "周啟明"),
  s("s3b05", "2302005", "梁嘉琪", "Leung Ka Ki", 3, "3B", "u-3b", "周啟明"),
  s("s3b06", "2302006", "羅子謙", "Lo Tsz Him", 3, "3B", "u-3b", "周啟明"),
  s("s5a01", "2101001", "陳樂文", "Chan Lok Man", 5, "5A", "u-5a", "林佩儀"),
  s("s5a02", "2101002", "黃詩涵", "Wong Sze Han", 5, "5A", "u-5a", "林佩儀"),
  s("s5a03", "2101003", "李浩廷", "Lee Ho Ting", 5, "5A", "u-5a", "林佩儀"),
  s("s5a04", "2101004", "張天恩", "Cheung Tin Yan", 5, "5A", "u-5a", "林佩儀"),
  s("s5a05", "2101005", "吳依琳", "Ng Yee Lam", 5, "5A", "u-5a", "林佩儀"),
  s("s5a06", "2101006", "周嘉朗", "Chow Ka Long", 5, "5A", "u-5a", "林佩儀"),
  s("s6a01", "2001001", "劉俊傑", "Lau Chun Kit", 6, "6A", "u-6a", "黃詠詩"),
  s("s6a02", "2001002", "鄭雅文", "Cheng Nga Man", 6, "6A", "u-6a", "黃詠詩"),
  s("s6a03", "2001003", "馬天朗", "Ma Tin Long", 6, "6A", "u-6a", "黃詠詩"),
  s("s6a04", "2001004", "何思穎", "Ho Sze Wing", 6, "6A", "u-6a", "黃詠詩"),
  s("s6a05", "2001005", "陳樂兒", "Chan Lok Yee", 6, "6A", "u-6a", "黃詠詩"),
  s("s6a06", "2001006", "林子軒", "Lam Tsz Hin", 6, "6A", "u-6a", "黃詠詩"),
  s("s6a07", "2001007", "黃梓謙", "Wong Tsz Him", 6, "6A", "u-6a", "黃詠詩"),
  ...generatedClassStudents(),
];

const absences: AbsenceRecord[] = [
  // 林凱晴 — 4 天計入，觸發一半上限預警
  a("ab-1", "s1a02", "2025-10-08", 1, "absent", "無故缺席", "none", false, "rejected", "家長未有回覆", "u-office", "2025-10-10T09:20:00+08:00"),
  a("ab-2", "s1a02", "2025-11-14", 1, "absent", "無故缺席", "none", false, "rejected", "未能聯絡家長", "u-office", "2025-11-17T11:05:00+08:00"),
  a("ab-3", "s1a02", "2026-01-20", 1, "leave", "家庭事務", "parent", true, "rejected", "家長信未註明具體原因，退回補交", "u-office", "2026-01-22T14:10:00+08:00", "母親林太", "07:42"),
  a("ab-4", "s1a02", "2026-03-05", 1, "absent", "無故缺席", "none", false, "pending"),

  // 黃子諾 — 10 天計入，超過 9 天上限
  a("ab-5", "s1a03", "2025-09-18", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-09-19T10:00:00+08:00"),
  a("ab-6", "s1a03", "2025-10-03", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-10-06T09:40:00+08:00"),
  a("ab-7", "s1a03", "2025-10-24", 1, "leave", "身體不適", "doctor", false, "rejected", "聲稱有醫生紙但未提交", "u-office", "2025-10-27T15:20:00+08:00", "父親黃先生", "07:18"),
  a("ab-8", "s1a03", "2025-11-21", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-11-24T09:15:00+08:00"),
  a("ab-9", "s1a03", "2025-12-05", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-12-08T10:30:00+08:00"),
  a("ab-10", "s1a03", "2026-01-09", 1, "leave", "感冒", "parent", true, "rejected", "家長信日期不符", "u-office", "2026-01-12T11:45:00+08:00", "母親黃太", "07:51"),
  a("ab-11", "s1a03", "2026-02-13", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-02-16T09:05:00+08:00"),
  a("ab-12", "s1a03", "2026-03-19", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-03-20T14:00:00+08:00"),
  a("ab-13", "s1a03", "2026-04-17", 1, "leave", "身體不適", "none", false, "pending", undefined, undefined, undefined, "母親黃太", "08:06"),
  a("ab-14", "s1a03", "2026-05-08", 1, "absent", "無故缺席", "none", false, "pending"),

  // 張嘉怡 — 3 天待審醫生證明（仍計入）+ 1 天已批准
  a("ab-15", "s1a04", "2025-11-06", 1, "leave", "腸胃炎", "doctor", true, "approved", "醫生證明齊全", "u-office", "2025-11-07T10:12:00+08:00", "母親張太", "07:28"),
  a("ab-16", "s1a04", "2026-04-22", 1, "leave", "流感", "doctor", true, "pending", undefined, undefined, undefined, "母親張太", "07:33"),
  a("ab-17", "s1a04", "2026-04-23", 1, "leave", "流感", "doctor", true, "pending", undefined, undefined, undefined, "母親張太", "07:40"),
  a("ab-18", "s1a04", "2026-05-15", 1, "leave", "覆診", "doctor", false, "pending", undefined, undefined, undefined, "父親張先生", "07:12"),

  // 吳浩然 — 5 天已批准病假不計入 + 1 天無故
  a("ab-19", "s1a05", "2025-10-15", 1, "leave", "骨折覆診", "doctor", true, "approved", "骨科醫生證明", "u-office", "2025-10-16T09:30:00+08:00", "母親吳太", "07:20"),
  a("ab-20", "s1a05", "2025-10-16", 1, "leave", "骨折覆診", "doctor", true, "approved", "骨科醫生證明", "u-office", "2025-10-16T09:30:00+08:00", "母親吳太", "07:22"),
  a("ab-21", "s1a05", "2025-10-17", 1, "leave", "骨折覆診", "doctor", true, "approved", "骨科醫生證明", "u-office", "2025-10-16T09:30:00+08:00", "母親吳太", "07:19"),
  a("ab-22", "s1a05", "2026-01-28", 1, "leave", "感冒", "parent", true, "approved", "家長信已核對", "u-office", "2026-01-29T11:00:00+08:00", "父親吳先生", "08:01"),
  a("ab-23", "s1a05", "2026-02-26", 1, "leave", "發燒", "doctor", true, "approved", "醫生證明", "u-office", "2026-02-27T09:50:00+08:00", "母親吳太", "07:08"),
  a("ab-24", "s1a05", "2026-05-21", 1, "absent", "無故缺席", "none", false, "pending"),

  // 周詠琳 — 2 天待審家長信
  a("ab-25", "s1a06", "2026-03-12", 1, "leave", "家中急事", "parent", true, "pending", undefined, undefined, undefined, "母親周太", "07:47"),
  a("ab-26", "s1a06", "2026-05-29", 1, "leave", "出席親人典禮", "parent", false, "pending", undefined, undefined, undefined, "父親周先生", "07:35"),

  // 鄭曉彤 — 1 天已批准
  a("ab-27", "s1a07", "2026-01-07", 1, "leave", "牙科治療", "doctor", true, "approved", "牙科證明", "u-office", "2026-01-08T10:00:00+08:00", "母親鄭太", "07:55"),

  // 馮俊宇 — 半日無故
  a("ab-28", "s1a08", "2026-04-09", 0.5, "absent", "上午缺席", "none", false, "pending"),

  // 3B
  a("ab-29", "s3b02", "2025-12-11", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-12-12T09:20:00+08:00"),
  a("ab-30", "s3b02", "2026-02-06", 1, "leave", "發燒", "doctor", true, "approved", "醫生證明", "u-office", "2026-02-09T10:40:00+08:00", "母親陳太", "07:16"),
  a("ab-31", "s3b02", "2026-03-26", 1, "absent", "無故缺席", "none", false, "pending"),
  a("ab-32", "s3b04", "2025-10-30", 1, "leave", "扁桃腺發炎", "doctor", true, "approved", "醫生證明", "u-office", "2025-10-31T09:10:00+08:00", "父親林先生", "07:44"),
  a("ab-33", "s3b04", "2026-04-02", 1, "leave", "家庭旅遊", "parent", true, "rejected", "非緊急事務，不獲批准為請假", "u-office", "2026-04-03T14:30:00+08:00", "母親林太", "08:20"),
  a("ab-34", "s3b05", "2026-05-14", 1, "leave", "偏頭痛", "parent", true, "pending", undefined, undefined, undefined, "母親黃太", "07:58"),
  a("ab-35", "s3b06", "2026-01-15", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-01-16T09:00:00+08:00"),
  a("ab-36", "s3b06", "2026-01-16", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-01-19T09:05:00+08:00"),
  a("ab-37", "s3b06", "2026-02-20", 1, "leave", "感冒", "doctor", false, "pending", undefined, undefined, undefined, "父親周先生", "07:26"),
  a("ab-38", "s3b06", "2026-04-24", 1, "absent", "無故缺席", "none", false, "pending"),

  // 5A — 李浩廷接近預警
  a("ab-39", "s5a03", "2025-09-25", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-09-26T10:00:00+08:00"),
  a("ab-40", "s5a03", "2025-11-13", 1, "leave", "哮喘", "doctor", true, "approved", "醫生證明", "u-office", "2025-11-14T09:20:00+08:00", "母親李太", "07:09"),
  a("ab-41", "s5a03", "2026-01-23", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-01-26T11:10:00+08:00"),
  a("ab-42", "s5a03", "2026-03-06", 1, "leave", "身體不適", "parent", true, "rejected", "內容過簡，退回", "u-office", "2026-03-09T10:00:00+08:00", "父親李先生", "07:38"),
  a("ab-43", "s5a02", "2026-02-04", 1, "leave", "腸胃不適", "parent", true, "approved", "家長信已核對", "u-office", "2026-02-05T09:40:00+08:00", "母親陳太", "07:31"),
  a("ab-44", "s5a06", "2025-12-18", 1, "absent", "無故缺席", "none", false, "pending"),
  a("ab-45", "s5a06", "2026-04-10", 0.5, "absent", "下午缺席", "none", false, "pending"),

  // 劉俊傑 — 2 天計入，中六預警
  a("ab-46", "s6a01", "2025-11-07", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-11-10T09:30:00+08:00"),
  a("ab-47", "s6a01", "2026-03-13", 1, "leave", "覆診", "doctor", false, "pending", undefined, undefined, undefined, "母親劉太", "07:14"),

  // 鄭雅文 — 5 天計入，超過 4.5 天
  a("ab-48", "s6a02", "2025-09-12", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-09-15T09:00:00+08:00"),
  a("ab-49", "s6a02", "2025-10-21", 1, "leave", "頭痛", "parent", true, "rejected", "未有醫生證明", "u-office", "2025-10-22T14:20:00+08:00", "母親鄭太", "07:49"),
  a("ab-50", "s6a02", "2026-01-08", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-01-09T10:10:00+08:00"),
  a("ab-51", "s6a02", "2026-02-27", 1, "leave", "身體不適", "none", false, "pending", undefined, undefined, undefined, "父親鄭先生", "08:11"),
  a("ab-52", "s6a02", "2026-04-16", 1, "absent", "無故缺席", "none", false, "pending"),

  // 馬天朗 — 半日已批准
  a("ab-53", "s6a03", "2026-01-30", 0.5, "leave", "上午覆診", "doctor", true, "approved", "醫生證明（上午）", "u-office", "2026-02-02T09:15:00+08:00", "母親馬太", "07:05"),

  // 何思穎 — 1.5 天待審
  a("ab-54", "s6a04", "2026-03-20", 1, "leave", "感冒", "parent", true, "pending", undefined, undefined, undefined, "母親何太", "07:36"),
  a("ab-55", "s6a04", "2026-05-08", 0.5, "leave", "下午牙科", "doctor", false, "pending", undefined, undefined, undefined, "母親何太", "07:21"),

  // 林子軒 — 3 天計入（已過中六預警，未達上限）
  a("ab-56", "s6a06", "2025-10-09", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-10-10T09:00:00+08:00"),
  a("ab-57", "s6a06", "2026-01-16", 1, "leave", "發燒", "parent", true, "rejected", "建議補交醫生證明", "u-office", "2026-01-19T11:20:00+08:00", "母親林太", "07:27"),
  a("ab-58", "s6a06", "2026-04-03", 1, "absent", "無故缺席", "none", false, "pending"),

  // 黃梓謙 — 4.5 天剛好達上限
  a("ab-59", "s6a07", "2025-09-26", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2025-09-29T09:10:00+08:00"),
  a("ab-60", "s6a07", "2025-11-28", 1, "leave", "身體不適", "parent", true, "rejected", "不獲批准", "u-office", "2025-12-01T10:00:00+08:00"),
  a("ab-61", "s6a07", "2026-02-12", 1, "absent", "無故缺席", "none", false, "rejected", "無文件", "u-office", "2026-02-13T09:40:00+08:00"),
  a("ab-62", "s6a07", "2026-03-27", 1, "leave", "感冒", "none", false, "pending", undefined, undefined, undefined, "父親黃先生", "07:53"),
  a("ab-63", "s6a07", "2026-05-22", 0.5, "absent", "上午缺席", "none", false, "pending"),

  // 學期末同步日（對應 eClass 同步紀錄）
  a("ab-64", "s1a01", "2026-06-12", 1, "absent", "無故缺席", "none", false, "pending"),
  a("ab-65", "s3b01", "2026-06-12", 1, "absent", "無故缺席", "none", false, "pending"),
  a("ab-66", "s6a05", "2026-06-12", 1, "leave", "覆診", "doctor", true, "pending", undefined, undefined, undefined, "母親陳太", "07:17"),
  a("ab-67", "s5a02", "2026-06-11", 1, "leave", "身體不適", "parent", true, "pending", undefined, undefined, undefined, "父親陳先生", "07:46"),
  a("ab-68", "s3b03", "2026-06-10", 1, "absent", "無故缺席", "none", false, "pending"),
  a("ab-69", "s1a07", "2026-06-10", 1, "leave", "家庭事務", "parent", false, "pending", undefined, undefined, undefined, "母親鄭太", "08:03"),
];

const warnings: WarningLetter[] = [
  w("warn-s1a02-half", "s1a02", "half_limit", "2026-03-05T16:00:00+08:00", 4, 9, "issued"),
  w("warn-s1a03-half", "s1a03", "half_limit", "2025-11-21T16:00:00+08:00", 4, 9, "followed_up", "u-office", "2025-11-24T11:00:00+08:00", "已致電家長，提醒補交文件及改善出勤。"),
  w("warn-s1a03-over", "s1a03", "over_limit", "2026-04-17T16:00:00+08:00", 9, 9, "issued"),
  w("warn-s3b06-half", "s3b06", "half_limit", "2026-04-24T16:00:00+08:00", 4, 9, "issued"),
  w("warn-s6a01-half", "s6a01", "half_limit", "2026-03-13T16:00:00+08:00", 2, 4.5, "issued"),
  w("warn-s6a02-half", "s6a02", "half_limit", "2025-10-21T16:00:00+08:00", 2, 4.5, "followed_up", "u-office", "2025-10-23T09:30:00+08:00", "已約見家長，說明中六缺席上限為 4.5 天。"),
  w("warn-s6a02-over", "s6a02", "over_limit", "2026-04-16T16:00:00+08:00", 5, 4.5, "issued"),
  w("warn-s6a06-half", "s6a06", "half_limit", "2026-01-16T16:00:00+08:00", 2, 4.5, "followed_up", "u-office", "2026-01-20T10:15:00+08:00", "已通知班主任黃詠詩跟進。"),
  w("warn-s6a07-half", "s6a07", "half_limit", "2025-11-28T16:00:00+08:00", 2, 4.5, "followed_up", "u-office", "2025-12-02T14:00:00+08:00", "已發信家長。"),
  w("warn-s6a07-over", "s6a07", "over_limit", "2026-05-22T16:00:00+08:00", 4.5, 4.5, "issued"),
];

const notifications: NotificationItem[] = [
  n("nt-1", "2026-06-12T08:12:00+08:00", "eClass 點名已同步", "已匯入 2026-06-12 上課日點名：出席 24、缺席 2、請假 1。", "sync", true),
  n("nt-2", "2026-05-22T16:00:00+08:00", "缺席已達上限：黃梓謙（中六甲）", "計入缺席 4.5 天，已自動發出警告信，請校務處跟進。", "warning", false, "s6a07", "warn-s6a07-over"),
  n("nt-3", "2026-05-15T08:20:00+08:00", "待審核文件：張嘉怡", "中一甲張嘉怡尚有 3 筆請假紀錄等待核對醫生證明。", "review", false, "s1a04"),
  n("nt-4", "2026-04-24T16:00:00+08:00", "缺席預警：羅子謙（中三乙）", "計入缺席已達 4 天（上限一半），已發出警告信。", "warning", true, "s3b06", "warn-s3b06-half"),
  n("nt-5", "2026-04-17T16:00:00+08:00", "缺席已超過上限：黃子諾（中一甲）", "計入缺席 10 天，已自動發出警告信，請即時跟進。", "warning", false, "s1a03", "warn-s1a03-over"),
  n("nt-6", "2026-04-16T16:00:00+08:00", "缺席已超過上限：鄭雅文（中六甲）", "計入缺席 5 天，已超過中六 4.5 天上限。", "warning", false, "s6a02", "warn-s6a02-over"),
  n("nt-7", "2026-03-13T16:00:00+08:00", "缺席預警：劉俊傑（中六甲）", "計入缺席已達 2 天，已發出警告信。", "warning", true, "s6a01", "warn-s6a01-half"),
  n("nt-9", "2026-06-12T08:35:00+08:00", "每日缺席名單已寄出", "已將 2026-06-12 全校各班缺席 Excel 電郵予指定收件人。", "digest", true),
];

const syncLogs: SyncLog[] = [
  {
    id: "sync-1",
    syncedAt: "2026-06-12T08:12:00+08:00",
    schoolDay: "2026-06-12",
    present: 24,
    absent: 2,
    leave: 1,
    note: "學期末最後上課日點名。老師於 eClass 完成點名後自動匯入。",
  },
  {
    id: "sync-2",
    syncedAt: "2026-06-11T08:09:00+08:00",
    schoolDay: "2026-06-11",
    present: 26,
    absent: 0,
    leave: 1,
    note: "eClass 日常同步。",
  },
  {
    id: "sync-3",
    syncedAt: "2026-06-10T08:14:00+08:00",
    schoolDay: "2026-06-10",
    present: 25,
    absent: 1,
    leave: 1,
    note: "eClass 日常同步。",
  },
];

const digestSettings: DigestSettings = {
  enabled: true,
  sendTime: "08:30",
  sendAfterSync: true,
  lastSentOn: "2026-06-12",
  lastSentSchoolDay: "2026-06-12",
};

const digestRecipients: DigestRecipient[] = [
  {
    id: "rcpt-office",
    name: "負責職員",
    email: "yang.hong@mkpk.edu.hk",
    title: "校務處及學生部",
    enabled: true,
  },
  {
    id: "rcpt-clerk",
    name: "校務處出勤組",
    email: "attendance@mkpk.edu.hk",
    title: "校務處",
    enabled: true,
  },
  {
    id: "rcpt-1a",
    name: "李志強",
    email: "lee.chi.keung@mkpk.edu.hk",
    title: "中一甲班主任",
    className: "1A",
    enabled: true,
  },
  {
    id: "rcpt-3b",
    name: "周啟明",
    email: "chow.kai.ming@mkpk.edu.hk",
    title: "中三乙班主任",
    className: "3B",
    enabled: true,
  },
  {
    id: "rcpt-5a",
    name: "林佩儀",
    email: "lam.pui.yee@mkpk.edu.hk",
    title: "中五甲班主任",
    className: "5A",
    enabled: true,
  },
  {
    id: "rcpt-6a",
    name: "黃詠詩",
    email: "wong.wing.sze@mkpk.edu.hk",
    title: "中六甲班主任",
    className: "6A",
    enabled: true,
  },
];

const digestLogs: DigestLog[] = [
  {
    id: "dg-1",
    createdAt: "2026-06-12T08:35:00+08:00",
    schoolDay: "2026-06-12",
    trigger: "auto",
    filename: "缺席名單-2026-06-12.xlsx",
    recipientEmails: digestRecipients.map((item) => item.email),
    classCount: 4,
    rowCount: 3,
    mode: "mock",
    note: "每日 08:30 自動整合 eClass 點名後寄出。",
  },
  {
    id: "dg-2",
    createdAt: "2026-06-11T08:32:00+08:00",
    schoolDay: "2026-06-11",
    trigger: "auto",
    filename: "缺席名單-2026-06-11.xlsx",
    recipientEmails: digestRecipients.map((item) => item.email),
    classCount: 4,
    rowCount: 1,
    mode: "mock",
    note: "每日 08:30 自動寄出。",
  },
];

export function createSeed(): AppState {
  return {
    academicYear,
    users,
    currentUserId: null,
    selectedClassName: null,
    students,
    absences,
    warnings,
    notifications,
    syncLogs,
    digestSettings,
    digestRecipients,
    digestLogs,
  };
}

function s(
  id: string,
  studentNo: string,
  name: string,
  nameEn: string,
  form: Student["form"],
  className: string,
  homeroomTeacherId: string,
  homeroomTeacherName: string
): Student {
  return {
    id,
    studentNo,
    name,
    nameEn,
    form,
    className,
    homeroomTeacherId,
    homeroomTeacherName,
  };
}

function a(
  id: string,
  studentId: string,
  date: string,
  days: 0.5 | 1,
  eclassStatus: AbsenceRecord["eclassStatus"],
  reason: string,
  documentType: AbsenceRecord["documentType"],
  documentSubmitted: boolean,
  reviewStatus: AbsenceRecord["reviewStatus"],
  notes?: string,
  reviewedBy?: string,
  reviewedAt?: string,
  calledBy?: string,
  calledAt?: string
): AbsenceRecord {
  return {
    id,
    studentId,
    date,
    days,
    eclassStatus,
    reason,
    documentType,
    documentSubmitted,
    reviewStatus,
    notes,
    reviewedBy,
    reviewedAt,
    calledBy,
    calledAt,
    source: "eclass",
  };
}

function w(
  id: string,
  studentId: string,
  type: WarningLetter["type"],
  issuedAt: string,
  triggerDays: number,
  limitDays: number,
  status: WarningLetter["status"],
  followedUpBy?: string,
  followedUpAt?: string,
  followUpNotes?: string
): WarningLetter {
  return {
    id,
    studentId,
    type,
    issuedAt,
    triggerDays,
    limitDays,
    status,
    followedUpBy,
    followedUpAt,
    followUpNotes,
  };
}

function n(
  id: string,
  createdAt: string,
  title: string,
  body: string,
  kind: NotificationItem["kind"],
  read: boolean,
  studentId?: string,
  warningId?: string
): NotificationItem {
  return { id, createdAt, title, body, kind, read, studentId, warningId };
}
