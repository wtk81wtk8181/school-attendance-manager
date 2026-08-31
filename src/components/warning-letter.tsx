import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import {
  absenceOccurrences,
  approvedLeaveDays,
  classLabel,
  countedAbsenceDays,
  lateOccurrences,
} from "@/lib/rules";
import { formatDate, formatShortDate } from "@/lib/format";
import type {
  AbsenceRecord,
  Student,
  WarningLetter as WarningLetterRecord,
  WarningType,
} from "@/lib/types";

type LetterLocale = "zh" | "en";
type LetterFocus = "absence_days" | "absence_count" | "late_count";

interface LetterStats {
  countedDays: number;
  absenceCount: number;
  lateCount: number;
  approvedLeaveDays: number;
}

function letterFocus(type: WarningType): LetterFocus {
  if (type === "frequent_late") return "late_count";
  if (type === "frequent_absence" || type === "frequent") return "absence_count";
  return "absence_days";
}

function buildLetterStats(records: AbsenceRecord[]): LetterStats {
  return {
    countedDays: countedAbsenceDays(records),
    absenceCount: absenceOccurrences(records),
    lateCount: lateOccurrences(records),
    approvedLeaveDays: approvedLeaveDays(records),
  };
}

function issuedMonthDay(iso: string) {
  const date = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return { month: date.getMonth() + 1, day: date.getDate() };
}

function issueSummaryZh(stats: LetterStats, focus: LetterFocus): string {
  if (focus === "late_count") return `${stats.lateCount} 次遲到`;
  if (focus === "absence_count") return `${stats.absenceCount} 次缺席`;
  const parts: string[] = [];
  if (stats.countedDays > 0) parts.push(`${stats.countedDays} 日缺席`);
  if (stats.lateCount > 0) parts.push(`${stats.lateCount} 次遲到`);
  return parts.join("及") || "0 日缺席";
}

function issueSummaryEn(stats: LetterStats, focus: LetterFocus): string {
  if (focus === "late_count") return `${stats.lateCount} late arrival(s)`;
  if (focus === "absence_count") return `${stats.absenceCount} absence(s)`;
  const parts: string[] = [];
  if (stats.countedDays > 0) parts.push(`${stats.countedDays} day(s) of absence`);
  if (stats.lateCount > 0) parts.push(`${stats.lateCount} late arrival(s)`);
  return parts.join(" and ") || "0 day(s) of absence";
}

function slipTotalZh(stats: LetterStats, focus: LetterFocus, triggerDays: number): string {
  if (focus === "late_count") return `${stats.lateCount} 次`;
  if (focus === "absence_count") return `${stats.absenceCount} 次`;
  return `${triggerDays} 日`;
}

function slipTotalEn(stats: LetterStats, focus: LetterFocus, triggerDays: number): string {
  if (focus === "late_count") return `${stats.lateCount}`;
  if (focus === "absence_count") return `${stats.absenceCount}`;
  return `${triggerDays}`;
}

function chineseTitle(focus: LetterFocus, isOver: boolean): string {
  if (isOver) return "學生缺席超過上限通知書";
  if (focus === "late_count") return "學生遲到次數預警通知書";
  if (focus === "absence_count") return "學生缺席次數預警通知書";
  return "學生缺席預警通知書";
}

function englishTitle(focus: LetterFocus, isOver: boolean): string {
  if (isOver) return "Notice of Absence Exceeding the Limit";
  if (focus === "late_count") return "Lateness Occurrence Alert Notice";
  if (focus === "absence_count") return "Absence Occurrence Alert Notice";
  return "Absence Alert Notice";
}

export function WarningLetterBundle({
  student,
  letter,
  academicYear,
  absences,
}: {
  student: Student;
  letter: WarningLetterRecord;
  academicYear: string;
  absences: AbsenceRecord[];
}) {
  const stats = buildLetterStats(absences);
  return (
    <div className="space-y-8 print:space-y-0">
      <WarningLetter
        student={student}
        letter={letter}
        locale="zh"
        academicYear={academicYear}
        stats={stats}
      />
      <WarningLetter
        student={student}
        letter={letter}
        locale="en"
        academicYear={academicYear}
        stats={stats}
      />
    </div>
  );
}

export function WarningLetter({
  student,
  letter,
  locale = "zh",
  academicYear,
  stats,
}: {
  student: Student;
  letter: WarningLetterRecord;
  locale?: LetterLocale;
  academicYear: string;
  stats: LetterStats;
}) {
  return locale === "en" ? (
    <EnglishLetter
      student={student}
      letter={letter}
      academicYear={academicYear}
      stats={stats}
    />
  ) : (
    <ChineseLetter
      student={student}
      letter={letter}
      academicYear={academicYear}
      stats={stats}
    />
  );
}

function ChineseLetter({
  student,
  letter,
  academicYear,
  stats,
}: {
  student: Student;
  letter: WarningLetterRecord;
  academicYear: string;
  stats: LetterStats;
}) {
  const focus = letterFocus(letter.type);
  const isOver = letter.type === "over_limit";
  const isLate = focus === "late_count";
  const { month, day } = issuedMonthDay(letter.issuedAt);
  const summary = issueSummaryZh(stats, focus);
  const slipTotal = slipTotalZh(stats, focus, letter.triggerDays);

  const notes = isLate
    ? [
        `獲批准病假（醫生證明或家長信）截止 ${month} 月 ${day} 日共有 ${stats.approvedLeaveDays} 日，不影響出席率。`,
        "經常遲到會影響守時紀錄及出席評核。",
      ]
    : [
        `獲批准病假（醫生證明或家長信）截止 ${month} 月 ${day} 日共有 ${stats.approvedLeaveDays} 日，不計入缺席上限，亦不影響出席率。`,
        "未批准請假或無故缺席會計入缺席日數，並拉低出席率。",
      ];

  return (
    <article className="letter-sheet mx-auto bg-white text-zinc-900">
      <header className="border-b-2 border-[var(--school-navy)] pb-4 text-center">
        <p className="text-xs tracking-[0.3em] text-[var(--school-gold)]">
          {SCHOOL_NAME_EN}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-widest text-[var(--school-navy)]">
          {SCHOOL_NAME}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">學生發展部　學生出勤事務</p>
        <h2 className="mt-4 text-xl font-semibold tracking-wide">
          {chineseTitle(focus, isOver)}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">中文版本</p>
      </header>

      <p className="mt-8 text-right text-sm">日期：{formatDate(letter.issuedAt)}</p>

      <p className="mt-6">貴家長：</p>

      <p className="mt-4 leading-8">
        根據本校紀錄，貴子弟
        <strong>
          {student.name}（{student.nameEn}）
        </strong>
        ，班別
        <strong>{classLabel(student.className)}</strong>
        ，學號
        <strong>{student.studentNo}</strong>
        ，於 <strong>{academicYear}</strong> 學年共有 <strong>{summary}</strong>
        ，現特此通知。（截止 <strong>{month}</strong> 月 <strong>{day}</strong> 日）
      </p>

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">注意事項</p>
        <ul className="mt-2 list-disc pl-5">
          {notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 leading-8">
        貴子弟至今共有 <strong>{summary}</strong>
        。請家長盡快向校務處補交相關證明文件，並與班主任
        <strong>{student.homeroomTeacherName}</strong>
        老師聯絡，共同跟進出勤情況。
      </p>

      <p className="mt-4 leading-8">
        {isOver
          ? "由於缺席情況需進一步跟進，學校將啟動相關程序。如有特殊原因，請盡快書面通知學校。"
          : "現特此預先通知。如已備妥醫生證明或家長信，請交回校務處審核。"}
      </p>

      <p className="mt-4 leading-8">
        {isLate
          ? "若果遲到過多，則會影響貴子弟升班。"
          : "若果未批准或無故缺席過多，則會影響貴子弟升班。"}
      </p>

      <p className="mt-8">此致</p>
      <p>家長／監護人</p>

      <div className="mt-10 flex items-end justify-between gap-6">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="inline-block size-4 border border-zinc-400" aria-hidden />
          已發
        </label>
        <div className="text-right">
          <p>{SCHOOL_NAME}學生發展部</p>
          <p className="mt-1 text-sm">此警告信由學生發展部發出</p>
          <p className="mt-1 text-sm text-zinc-600">
            發出日期：{formatShortDate(letter.issuedAt)}
          </p>
        </div>
      </div>

      <section className="letter-ack-slip mt-10 border-t border-dashed border-zinc-400 pt-6">
        <p className="text-sm font-medium text-zinc-700">回條（請家長簽署後交回學校）</p>
        <p className="mt-4 leading-8">
          本人已知悉截至 <strong>{month}</strong> 月 <strong>{day}</strong> 日，敝子弟
          <strong> {student.name}</strong> 已缺席／遲到共 <strong>{slipTotal}</strong>
          ，並明白有機會影響其升班。
        </p>
        <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
          <p>
            家長／監護人簽署：
            <span className="ml-2 inline-block min-w-40 border-b border-zinc-400" />
          </p>
          <p>
            日期：
            <span className="ml-2 inline-block min-w-32 border-b border-zinc-400" />
          </p>
        </div>
      </section>
    </article>
  );
}

function EnglishLetter({
  student,
  letter,
  academicYear,
  stats,
}: {
  student: Student;
  letter: WarningLetterRecord;
  academicYear: string;
  stats: LetterStats;
}) {
  const focus = letterFocus(letter.type);
  const isOver = letter.type === "over_limit";
  const isLate = focus === "late_count";
  const { month, day } = issuedMonthDay(letter.issuedAt);
  const summary = issueSummaryEn(stats, focus);
  const slipTotal = slipTotalEn(stats, focus, letter.triggerDays);

  const notes = isLate
    ? [
        `Approved sick leave (medical certificate or parent letter) up to ${month}/${day}: ${stats.approvedLeaveDays} day(s), which does not affect the attendance rate.`,
        "Frequent lateness may affect punctuality records and attendance assessment.",
      ]
    : [
        `Approved sick leave (medical certificate or parent letter) up to ${month}/${day}: ${stats.approvedLeaveDays} day(s), which is not counted towards the absence limit and does not affect the attendance rate.`,
        "Unapproved leave or unexplained absence is counted and will lower the attendance rate.",
      ];

  return (
    <article className="letter-sheet letter-sheet-en mx-auto bg-white text-zinc-900">
      <header className="border-b-2 border-[var(--school-navy)] pb-4 text-center">
        <p className="text-xs tracking-[0.3em] text-[var(--school-gold)]">
          {SCHOOL_NAME_EN}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-widest text-[var(--school-navy)]">
          {SCHOOL_NAME}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Student Development Department · Student Attendance
        </p>
        <h2 className="mt-4 text-xl font-semibold tracking-wide">
          {englishTitle(focus, isOver)}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">English version</p>
      </header>

      <p className="mt-8 text-right text-sm">Date: {formatDate(letter.issuedAt)}</p>

      <p className="mt-6">Dear Parent / Guardian,</p>

      <p className="mt-4 leading-8">
        According to our school records, your child
        <strong>
          {" "}
          {student.name} ({student.nameEn})
        </strong>
        , class
        <strong> {classLabel(student.className)}</strong>
        , student number
        <strong> {student.studentNo}</strong>
        , has recorded <strong>{summary}</strong> in the <strong>{academicYear}</strong>{" "}
        academic year. This notice is hereby issued. (As of <strong>{month}/{day}</strong>)
      </p>

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">Notes</p>
        <ul className="mt-2 list-disc pl-5">
          {notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 leading-8">
        Your child has accumulated <strong>{summary}</strong> to date. Please submit
        supporting documents to the School Office as soon as possible, and contact the
        class teacher, <strong>{student.homeroomTeacherName}</strong>, so that we may
        follow up together.
      </p>

      <p className="mt-4 leading-8">
        {isOver
          ? "As further follow-up is required, the school will initiate related procedures. If there are special reasons, please notify the school in writing as soon as possible."
          : "This is an advance notice. If a medical certificate or parent letter is ready, please return it to the School Office for review."}
      </p>

      <p className="mt-4 leading-8">
        {isLate
          ? "If lateness becomes excessive, your child may not be promoted to the next form."
          : "If unapproved or unexplained absence becomes excessive, your child may not be promoted to the next form."}
      </p>

      <p className="mt-8">Yours faithfully,</p>
      <p>Parent / Guardian</p>

      <div className="mt-10 flex items-end justify-between gap-6">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="inline-block size-4 border border-zinc-400" aria-hidden />
          Issued
        </label>
        <div className="text-right">
          <p>{SCHOOL_NAME_EN} Student Development Department</p>
          <p className="mt-1 text-sm">
            This warning letter is issued by the Student Development Department.
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Date of issue: {formatShortDate(letter.issuedAt)}
          </p>
        </div>
      </div>

      <section className="letter-ack-slip mt-10 border-t border-dashed border-zinc-400 pt-6">
        <p className="text-sm font-medium text-zinc-700">
          Acknowledgment slip (please sign and return to school)
        </p>
        <p className="mt-4 leading-8">
          I acknowledge that as of <strong>{month}/{day}</strong>, my child
          <strong> {student.name}</strong> has been absent / late for a total of{" "}
          <strong>{slipTotal}</strong>, and I understand this may affect promotion to the
          next form.
        </p>
        <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
          <p>
            Parent / Guardian signature:
            <span className="ml-2 inline-block min-w-40 border-b border-zinc-400" />
          </p>
          <p>
            Date:
            <span className="ml-2 inline-block min-w-32 border-b border-zinc-400" />
          </p>
        </div>
      </section>
    </article>
  );
}
