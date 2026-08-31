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

function resolveLetterDisplay(letter: WarningLetterRecord, stats: LetterStats) {
  const focus = letterFocus(letter.type);
  const trigger = letter.triggerDays;

  const countedDays = Math.max(
    stats.countedDays,
    focus === "absence_days" || focus === "absence_count" || letter.type === "over_limit"
      ? trigger
      : 0
  );
  const absenceCount = Math.max(
    stats.absenceCount,
    focus === "absence_count" ? trigger : 0
  );
  const lateCount = Math.max(stats.lateCount, focus === "late_count" ? trigger : 0);

  const displayStats: LetterStats = {
    countedDays,
    absenceCount,
    lateCount,
    approvedLeaveDays: stats.approvedLeaveDays,
  };

  return {
    focus,
    displayStats,
    summaryZh: issueSummaryZh(displayStats, focus),
    summaryEn: issueSummaryEn(displayStats, focus),
    slipDays: Math.max(countedDays, trigger),
  };
}

function LetterHeaderZh({
  academicYear,
  issuedAt,
}: {
  academicYear: string;
  issuedAt: string;
}) {
  return (
    <header className="border-b border-zinc-300 pb-4">
      <p className="text-center text-xs tracking-[0.25em] text-zinc-600">
        {SCHOOL_NAME_EN}
      </p>
      <h1 className="mt-1 text-center font-serif text-3xl tracking-widest text-zinc-900">
        {SCHOOL_NAME}
      </h1>
      <div className="mx-auto mt-3 flex max-w-md items-center justify-between text-sm text-zinc-700">
        <span>學生出勤事務</span>
        <span className="font-medium tabular-nums">{academicYear}</span>
      </div>
      <h2 className="mt-4 text-center text-xl font-semibold tracking-wide">
        學生缺席／遲到通知書
      </h2>
      <p className="mt-1 text-center text-xs text-zinc-500">中文版本</p>
      <p className="mt-4 text-right text-sm">日期：{formatDate(issuedAt)}</p>
    </header>
  );
}

function LetterHeaderEn({
  academicYear,
  issuedAt,
}: {
  academicYear: string;
  issuedAt: string;
}) {
  return (
    <header className="border-b border-zinc-300 pb-4">
      <p className="text-center text-xs tracking-[0.25em] text-zinc-600">
        {SCHOOL_NAME_EN}
      </p>
      <h1 className="mt-1 text-center font-serif text-3xl tracking-widest text-zinc-900">
        {SCHOOL_NAME}
      </h1>
      <div className="mx-auto mt-3 flex max-w-md items-center justify-between text-sm text-zinc-700">
        <span>Student Attendance Affairs</span>
        <span className="font-medium tabular-nums">{academicYear}</span>
      </div>
      <h2 className="mt-4 text-center text-xl font-semibold tracking-wide">
        Student Absence / Lateness Notice
      </h2>
      <p className="mt-1 text-center text-xs text-zinc-500">English version</p>
      <p className="mt-4 text-right text-sm">Date: {formatDate(issuedAt)}</p>
    </header>
  );
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
  const { month, day } = issuedMonthDay(letter.issuedAt);
  const { focus, displayStats, summaryZh: summary, slipDays } = resolveLetterDisplay(
    letter,
    stats
  );
  const isOver = letter.type === "over_limit";
  const isLate = focus === "late_count";

  const notes = isLate
    ? [
        `獲批准病假（醫生證明或家長信）截止 ${month} 月 ${day} 日共有 ${displayStats.approvedLeaveDays} 日，不影響出席率。`,
        "經常遲到會影響守時紀錄及出席評核。",
      ]
    : [
        `獲批准病假（醫生證明或家長信）截止 ${month} 月 ${day} 日共有 ${displayStats.approvedLeaveDays} 日，不計入缺席上限，亦不影響出席率。`,
        "未批准請假或無故缺席會計入缺席日數，並拉低出席率。",
      ];

  return (
    <article className="letter-sheet mx-auto bg-white text-zinc-900">
      <LetterHeaderZh academicYear={academicYear} issuedAt={letter.issuedAt} />

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
          本人已知悉截止 <strong>{month}</strong> 月 <strong>{day}</strong> 日，敝子弟
          <strong>
            {classLabel(student.className)}班{student.name}
          </strong>
          已缺席共 <strong>{slipDays}</strong> 天，亦明白有機會影響其升班。
        </p>
        <div className="mt-8 flex justify-end text-sm">
          <p>
            閱後簽署：
            <span className="ml-2 inline-block min-w-48 border-b border-zinc-400" />
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
  const { month, day } = issuedMonthDay(letter.issuedAt);
  const { focus, displayStats, summaryEn: summary, slipDays } = resolveLetterDisplay(
    letter,
    stats
  );
  const isOver = letter.type === "over_limit";
  const isLate = focus === "late_count";

  const notes = isLate
    ? [
        `Approved sick leave (medical certificate or parent letter) as at ${month}/${day}: ${displayStats.approvedLeaveDays} day(s), which does not affect the attendance rate.`,
        "Frequent lateness may affect punctuality records and attendance assessment.",
      ]
    : [
        `Approved sick leave (medical certificate or parent letter) as at ${month}/${day}: ${displayStats.approvedLeaveDays} day(s), which is not counted towards the absence limit and does not affect the attendance rate.`,
        "Unapproved leave or unexplained absence is counted towards absence days and will lower the attendance rate.",
      ];

  return (
    <article className="letter-sheet letter-sheet-en mx-auto bg-white text-zinc-900">
      <LetterHeaderEn academicYear={academicYear} issuedAt={letter.issuedAt} />

      <p className="mt-6">Dear Parent / Guardian,</p>

      <p className="mt-4 leading-8">
        According to our school records, your child
        <strong>
          {" "}
          {student.nameEn} ({student.name})
        </strong>
        , class
        <strong> {classLabel(student.className)}</strong>
        , student number
        <strong> {student.studentNo}</strong>
        , has recorded <strong>{summary}</strong> in the <strong>{academicYear}</strong>{" "}
        academic year. This notice is hereby issued. (As of <strong>{month}</strong>/
        <strong>{day}</strong>)
      </p>

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">Important Notes</p>
        <ul className="mt-2 list-disc pl-5">
          {notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 leading-8">
        Your child has accumulated <strong>{summary}</strong> to date. Please submit
        supporting documents to the School Office as soon as possible, and contact the
        class teacher, <strong>{student.homeroomTeacherName}</strong>, to follow up on
        attendance together.
      </p>

      <p className="mt-4 leading-8">
        {isOver
          ? "As your child's absence requires further follow-up, the school will initiate related procedures. If there are special reasons, please notify the school in writing as soon as possible."
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
          I acknowledge that as of <strong>{month}</strong>/<strong>{day}</strong>, my child
          in class
          <strong>
            {" "}
            {classLabel(student.className)} {student.nameEn}
          </strong>{" "}
          has been absent for a total of <strong>{slipDays}</strong> day(s), and I also
          understand that this may affect promotion to the next form.
        </p>
        <div className="mt-8 flex justify-end text-sm">
          <p>
            Sign after reading:
            <span className="ml-2 inline-block min-w-48 border-b border-zinc-400" />
          </p>
        </div>
      </section>
    </article>
  );
}
