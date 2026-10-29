import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import {
  absenceOccurrences,
  approvedLeaveDays,
  classLabel,
  countedAbsenceDays,
  lateOccurrences,
  needsDocumentChase,
} from "@/lib/rules";
import type {
  AbsenceRecord,
  Student,
  WarningLetter as WarningLetterRecord,
} from "@/lib/types";

type LetterLocale = "zh" | "en";

/** 本批警告信的截止日期（信內不再寫發出日期） */
const CUTOFF_ISO = "2026-10-29";
const CUTOFF_ZH = "2026 年 10 月 29 日";
const CUTOFF_EN = "29 October 2026";

interface LetterStats {
  countedDays: number;
  absenceCount: number;
  lateCount: number;
  approvedLeaveDays: number;
  /** 尚未繳交醫生紙或家長信的日期（Y-m-d） */
  outstandingDates: string[];
}

function buildLetterStats(records: AbsenceRecord[]): LetterStats {
  return {
    countedDays: countedAbsenceDays(records),
    absenceCount: absenceOccurrences(records),
    lateCount: lateOccurrences(records),
    approvedLeaveDays: approvedLeaveDays(records),
    outstandingDates: [...new Set(records.filter(needsDocumentChase).map((item) => item.date))].sort(),
  };
}

function formatFigure(value: number): string {
  return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1);
}

function issueSummaryZh(stats: LetterStats): string {
  return `${formatFigure(stats.countedDays)} 日缺席及 ${stats.lateCount} 次遲到`;
}

function issueSummaryEn(stats: LetterStats): string {
  return `${formatFigure(stats.countedDays)} day(s) of absence and ${stats.lateCount} late arrival(s)`;
}

function formatDmy(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}

function outstandingZh(stats: LetterStats): string {
  if (stats.outstandingDates.length === 0) {
    return "現時已繳交所有相關證明文件。";
  }
  const dates = stats.outstandingDates.map(formatDmy).join("、");
  return `尚未繳交醫生紙或家長信的日期：${dates}。`;
}

function outstandingEn(stats: LetterStats): string {
  if (stats.outstandingDates.length === 0) {
    return "All supporting documents have now been submitted.";
  }
  const dates = stats.outstandingDates.map(formatDmy).join(", ");
  return `Date(s) without a doctor's note or parent's letter: ${dates}.`;
}

function LetterHeaderZh({ academicYear }: { academicYear: string }) {
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
      <p className="mt-4 text-right text-sm">截至 {CUTOFF_ZH}</p>
    </header>
  );
}

function LetterHeaderEn({ academicYear }: { academicYear: string }) {
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
      <p className="mt-4 text-right text-sm">As at {CUTOFF_EN}</p>
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
  const inScope = absences.filter((item) => item.date <= CUTOFF_ISO);
  const stats = buildLetterStats(inScope);
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
  const summary = issueSummaryZh(stats);
  const isOver = letter.type === "over_limit";

  const notes = [
    outstandingZh(stats),
    `獲批准病假（已交醫生證明或家長信）現時共有 ${formatFigure(stats.approvedLeaveDays)} 日，不計入缺席上限，亦不影響出席率。`,
    "未批准請假或無故缺席會計入缺席日數，並拉低出席率。",
    "遲到次數與缺席日數同列於本通知。經常遲到會影響守時紀錄及出席評核。",
  ];

  return (
    <article className="letter-sheet mx-auto bg-white text-zinc-900">
      <LetterHeaderZh academicYear={academicYear} />

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
        ，截至 <strong>{CUTOFF_ZH}</strong>，於 <strong>{academicYear}</strong>{" "}
        學年共有 <strong>{summary}</strong>，現特此通知。
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
        貴子弟截至 <strong>{CUTOFF_ZH}</strong> 共有 <strong>{summary}</strong>
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
        若果未批准或缺席日數過多，或遲到次數過多，則會影響貴子弟升班。
      </p>

      <p className="mt-8">此致</p>
      <p>家長／監護人</p>

      <div className="mt-10 flex items-end justify-end gap-6">
        <div className="text-right">
          <p>{SCHOOL_NAME}學生發展部</p>
          <p className="mt-1 text-sm">此警告信由學生發展部發出</p>
        </div>
      </div>

      <section className="letter-ack-slip mt-10 border-t border-dashed border-zinc-400 pt-6">
        <p className="text-sm font-medium text-zinc-700">回條（請家長簽署後交回學校）</p>
        <p className="mt-4 leading-8">
          本人已知悉敝子弟
          <strong>
            {classLabel(student.className)}班{student.name}
          </strong>
          截至 {CUTOFF_ZH} 已缺席共 <strong>{formatFigure(stats.countedDays)}</strong>{" "}
          天、遲到共 <strong>{stats.lateCount}</strong> 次，亦明白有機會影響其升班。
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
  const summary = issueSummaryEn(stats);
  const isOver = letter.type === "over_limit";

  const notes = [
    outstandingEn(stats),
    `Approved sick leave (a submitted doctor's note or parent's letter) currently totals ${formatFigure(stats.approvedLeaveDays)} day(s). It is not counted towards the absence limit and does not affect the attendance rate.`,
    "Unapproved leave or unexplained absence is counted towards absence days and will lower the attendance rate.",
    "Late arrivals are listed together with absence days in this notice. Frequent lateness may affect punctuality records and attendance assessment.",
  ];

  return (
    <article className="letter-sheet letter-sheet-en mx-auto bg-white text-zinc-900">
      <LetterHeaderEn academicYear={academicYear} />

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
        , as at <strong>{CUTOFF_EN}</strong>, has <strong>{summary}</strong> in the{" "}
        <strong>{academicYear}</strong> academic year. This notice is hereby issued.
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
        Your child has accumulated <strong>{summary}</strong> as at {CUTOFF_EN}. Please
        submit supporting documents to the School Office as soon as possible, and contact
        the class teacher, <strong>{student.homeroomTeacherName}</strong>, to follow up on
        attendance together.
      </p>

      <p className="mt-4 leading-8">
        {isOver
          ? "As your child's absence requires further follow-up, the school will initiate related procedures. If there are special reasons, please notify the school in writing as soon as possible."
          : "This is an advance notice. If a medical certificate or parent letter is ready, please return it to the School Office for review."}
      </p>

      <p className="mt-4 leading-8">
        If unapproved absence or lateness becomes excessive, your child may not be promoted
        to the next form.
      </p>

      <p className="mt-8">Yours faithfully,</p>
      <p>Parent / Guardian</p>

      <div className="mt-10 flex items-end justify-end gap-6">
        <div className="text-right">
          <p>{SCHOOL_NAME_EN} Student Development Department</p>
          <p className="mt-1 text-sm">
            This warning letter is issued by the Student Development Department.
          </p>
        </div>
      </div>

      <section className="letter-ack-slip mt-10 border-t border-dashed border-zinc-400 pt-6">
        <p className="text-sm font-medium text-zinc-700">
          Acknowledgment slip (please sign and return to school)
        </p>
        <p className="mt-4 leading-8">
          I acknowledge that my child in class
          <strong>
            {" "}
            {classLabel(student.className)} {student.nameEn}
          </strong>{" "}
          has been absent for <strong>{formatFigure(stats.countedDays)}</strong> day(s) and
          late <strong>{stats.lateCount}</strong> time(s) as at {CUTOFF_EN}, and I also
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
