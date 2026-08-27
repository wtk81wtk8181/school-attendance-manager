import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import { classLabel, formLabel, formLabelEn } from "@/lib/rules";
import { formatDate, formatShortDate } from "@/lib/format";
import type { Student, WarningLetter as WarningLetterRecord, WarningType } from "@/lib/types";

type LetterLocale = "zh" | "en";
type LetterFocus = "absence_days" | "absence_count" | "late_count";

function letterFocus(type: WarningType): LetterFocus {
  if (type === "frequent_late") return "late_count";
  if (type === "frequent_absence" || type === "frequent") return "absence_count";
  return "absence_days";
}

export function WarningLetterBundle({
  student,
  letter,
}: {
  student: Student;
  letter: WarningLetterRecord;
}) {
  return (
    <div className="space-y-8 print:space-y-0">
      <WarningLetter student={student} letter={letter} locale="zh" />
      <WarningLetter student={student} letter={letter} locale="en" />
    </div>
  );
}

export function WarningLetter({
  student,
  letter,
  locale = "zh",
}: {
  student: Student;
  letter: WarningLetterRecord;
  locale?: LetterLocale;
}) {
  return locale === "en" ? (
    <EnglishLetter student={student} letter={letter} />
  ) : (
    <ChineseLetter student={student} letter={letter} />
  );
}

function ChineseLetter({
  student,
  letter,
}: {
  student: Student;
  letter: WarningLetterRecord;
}) {
  const focus = letterFocus(letter.type);
  const isOver = letter.type === "over_limit";
  const isLate = focus === "late_count";

  const title =
    isOver
      ? "學生缺席超過上限通知書"
      : isLate
        ? "學生遲到預警通知書"
        : focus === "absence_count"
          ? "學生缺席次數預警通知書"
          : "學生缺席預警通知書";

  const opening =
    focus === "late_count"
      ? "於 2026-2027 學年之遲到情況，現特此通知。"
      : "於 2026-2027 學年之缺席情況，現特此通知。";

  const followUp =
    isLate
      ? `該生現時就讀${formLabel(student.form)}。請家長留意子弟守時情況，如遲到或有特殊原因，請盡早向校務處提交證明文件，並與班主任${student.homeroomTeacherName}老師聯絡。`
      : `該生現時就讀${formLabel(student.form)}。請家長盡快向校務處補交相關證明文件，並與班主任${student.homeroomTeacherName}老師聯絡，共同跟進出勤情況。`;

  const notes =
    isLate
      ? [
          "獲批請假（醫生證明或家長信）不影響出席率。",
          "經常遲到會影響守時紀錄及出席評核。",
        ]
      : [
          "獲批請假（醫生證明或家長信）不計入缺席上限，亦不影響出席率。",
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
        <h2 className="mt-4 text-xl font-semibold tracking-wide">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">中文版本</p>
      </header>

      <p className="mt-8 text-right text-sm">日期：{formatDate(letter.issuedAt)}</p>

      <p className="mt-6">敬啟者：</p>

      <p className="mt-4 leading-8">
        本校紀錄顯示，貴子弟
        <strong>
          {student.name}（{student.nameEn}）
        </strong>
        ，班別
        <strong>{classLabel(student.className)}</strong>
        ，學號
        <strong>{student.studentNo}</strong>
        ，{opening}
      </p>

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">注意事項</p>
        <ul className="mt-2 list-disc pl-5">
          {notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 leading-8">{followUp}</p>

      <p className="mt-4 leading-8">
        {isOver
          ? "由於缺席情況需進一步跟進，學生部將啟動相關程序，或影響學年評核及相關安排。如有特殊原因，請盡快書面通知學校。"
          : "現特此預先通知。如已備妥醫生證明或家長信，請交回校務處審核。"}
      </p>

      {!isLate ? (
        <p className="mt-4 leading-8">若果缺席日數過多，會影響升班。</p>
      ) : (
        <p className="mt-4 leading-8">若果遲到次數過多，會影響守時評核及升班安排。</p>
      )}

      <p className="mt-8">此致</p>
      <p>家長／監護人</p>

      <div className="mt-10 text-right">
        <p>{SCHOOL_NAME}學生發展部</p>
        <p className="mt-1 text-sm">此警告信由學生發展部發出</p>
        <p className="mt-1 text-sm text-zinc-600">發出日期：{formatShortDate(letter.issuedAt)}</p>
      </div>
    </article>
  );
}

function EnglishLetter({
  student,
  letter,
}: {
  student: Student;
  letter: WarningLetterRecord;
}) {
  const focus = letterFocus(letter.type);
  const isOver = letter.type === "over_limit";
  const isLate = focus === "late_count";

  const title =
    isOver
      ? "Notice of Absence Exceeding the Limit"
      : isLate
        ? "Lateness Alert Notice"
        : focus === "absence_count"
          ? "Absence Occurrence Alert Notice"
          : "Absence Alert Notice";

  const opening =
    focus === "late_count"
      ? "has attendance concerns regarding lateness in the 2026-2027 academic year. Please take note of this notice."
      : "has attendance concerns regarding absence in the 2026-2027 academic year. Please take note of this notice.";

  const followUp =
    isLate
      ? `Your child is currently in ${formLabelEn(student.form)}. Please pay attention to punctuality. If there is lateness for a special reason, please submit supporting documents to the School Office as soon as possible, and contact the class teacher, ${student.homeroomTeacherName}.`
      : `Your child is currently in ${formLabelEn(student.form)}. Please submit supporting documents to the School Office as soon as possible, and contact the class teacher, ${student.homeroomTeacherName}, so that we may follow up together.`;

  const notes =
    isLate
      ? [
          "Approved leave (medical certificate or parent letter) does not affect the attendance rate.",
          "Frequent lateness may affect punctuality records and attendance assessment.",
        ]
      : [
          "Approved leave (medical certificate or parent letter) is not counted towards the absence limit and does not affect the attendance rate.",
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
        <h2 className="mt-4 text-xl font-semibold tracking-wide">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">English version</p>
      </header>

      <p className="mt-8 text-right text-sm">Date: {formatDate(letter.issuedAt)}</p>

      <p className="mt-6">Dear Parent / Guardian,</p>

      <p className="mt-4 leading-8">
        School records show that your child
        <strong>
          {" "}
          {student.name} ({student.nameEn})
        </strong>
        , class
        <strong> {classLabel(student.className)}</strong>
        , student number
        <strong> {student.studentNo}</strong>
        , {opening}
      </p>

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">Notes</p>
        <ul className="mt-2 list-disc pl-5">
          {notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="mt-4 leading-8">{followUp}</p>

      <p className="mt-4 leading-8">
        {isOver
          ? "As further follow-up is required, the Student Affairs Office will start related procedures, which may affect academic assessment and related arrangements. If there are special reasons, please notify the school in writing as soon as possible."
          : "This is an advance notice. If a medical certificate or parent letter is ready, please return it to the School Office for review."}
      </p>

      <p className="mt-4 leading-8">
        {isLate
          ? "Excessive lateness may affect punctuality assessment and promotion arrangements."
          : "Excessive absence may affect promotion to the next form."}
      </p>

      <p className="mt-8">Yours faithfully,</p>
      <p>Student Development Department</p>
      <p>{SCHOOL_NAME_EN}</p>

      <div className="mt-10 text-right">
        <p>{SCHOOL_NAME_EN} Student Development Department</p>
        <p className="mt-1 text-sm">This warning letter is issued by the Student Development Department.</p>
        <p className="mt-1 text-sm text-zinc-600">
          Date of issue: {formatShortDate(letter.issuedAt)}
        </p>
      </div>
    </article>
  );
}
