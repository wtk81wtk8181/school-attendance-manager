import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import { classLabel, formatDays, formLabel, formLabelEn } from "@/lib/rules";
import { formatDate, formatShortDate } from "@/lib/format";
import type { Student, WarningLetter as WarningLetterRecord } from "@/lib/types";

type LetterLocale = "zh" | "en";

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
  const isOver = letter.type === "over_limit";
  const isFrequent = letter.type === "frequent";
  const limitNote =
    student.form === 6
      ? "中六學生缺席不可超過 4.5 天"
      : "中一至中五學生缺席不可超過 9 天";

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
          {isOver
            ? "學生缺席超過上限通知書"
            : isFrequent
              ? "學生出席預警通知書（缺席／遲到）"
              : "學生缺席預警通知書"}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">中文版本</p>
      </header>

      <p className="mt-8 text-right text-sm">日期：{formatDate(letter.issuedAt)}</p>

      <p className="mt-6">敬啟者：</p>

      {isFrequent ? (
        <p className="mt-4 leading-8">
          本校紀錄顯示，貴子弟
          <strong>
            {student.name}（{student.nameEn}）
          </strong>
          ，班別
          <strong>{classLabel(student.className)}</strong>
          ，學號
          <strong>{student.studentNo}</strong>
          ，於 2026-2027 學年缺席及遲到合計已超過學校規定之 <strong>3 次</strong>
          出席預警界線，現特此通知。
        </p>
      ) : (
        <p className="mt-4 leading-8">
          本校紀錄顯示，貴子弟
          <strong>
            {student.name}（{student.nameEn}）
          </strong>
          ，班別
          <strong>{classLabel(student.className)}</strong>
          ，學號
          <strong>{student.studentNo}</strong>
          ，於 2026-2027 學年之缺席情況已
          {isOver ? "達至或超過" : "達到"}
          學校缺席上限（{limitNote}）之
          {isOver ? "規定" : "一半"}。
        </p>
      )}

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">校規摘要</p>
        <ul className="mt-2 list-disc pl-5">
          <li>中一至中五：缺席不可超過 9 天；達 4 天發出預警。</li>
          <li>中六：缺席不可超過 4.5 天；達 2 天發出預警。</li>
          <li>缺席及遲到合計超過 3 次，系統會自動發出預警並通知家長。</li>
          <li>獲批請假（醫生證明或家長信）不計入缺席上限，亦不影響出席率。</li>
          <li>未批准請假或無故缺席會計入缺席日數，並拉低出席率。</li>
        </ul>
      </div>

      <p className="mt-4 leading-8">
        {isFrequent
          ? `該生現時就讀${formLabel(student.form)}。請家長留意子弟出勤情況，如遲到或有特殊原因缺席，請盡早向校務處提交醫生證明或家長信，並與班主任${student.homeroomTeacherName}老師聯絡。`
          : `該生現時就讀${formLabel(student.form)}
        ，缺席上限為 ${formatDays(letter.limitDays)} 天。請家長盡快向校務處補交相關證明文件，並與班主任
        ${student.homeroomTeacherName}老師聯絡，共同跟進出勤情況。`}
      </p>

      <p className="mt-4 leading-8">
        {isOver
          ? "由於缺席日數已達或超過上限，學生部將啟動跟進程序，或影響學年評核及相關安排。如有特殊原因，請盡快書面通知學校。"
          : isFrequent
            ? "現特此預先通知，以免日後觸及缺席上限。如已備妥醫生證明或家長信，請交回校務處審核。"
            : "現特此預先通知，以免日後超過上限。如已備妥醫生證明或家長信，請交回校務處審核。"}
      </p>

      <p className="mt-4 leading-8">若果缺席日數過多，會影響升班。</p>

      <p className="mt-8">此致</p>
      <p>家長／監護人</p>

      <div className="mt-10 text-right">
        <p>{SCHOOL_NAME}學生發展部</p>
        <p className="mt-1 text-sm">此警告信由學生發展部發出</p>
        <p className="mt-1 text-sm text-zinc-600">發出日期：{formatShortDate(letter.issuedAt)}</p>
        <p className="text-sm text-zinc-600">文件編號：{letter.id}</p>
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
  const isOver = letter.type === "over_limit";
  const isFrequent = letter.type === "frequent";
  const limitNote =
    student.form === 6
      ? "S.6 students must not be absent for more than 4.5 days"
      : "S.1 to S.5 students must not be absent for more than 9 days";

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
          {isOver
            ? "Notice of Absence Exceeding the Limit"
            : isFrequent
              ? "Attendance Alert (Absence / Lateness)"
              : "Absence Alert Notice"}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">English version</p>
      </header>

      <p className="mt-8 text-right text-sm">Date: {formatDate(letter.issuedAt)}</p>

      <p className="mt-6">Dear Parent / Guardian,</p>

      {isFrequent ? (
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
          , has exceeded the school alert threshold of{" "}
          <strong>3 combined absence and lateness occurrences</strong>
          {" "}in the 2026-2027 academic year.
        </p>
      ) : (
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
          , has
          {isOver ? " reached or exceeded " : " reached half of "}
          the school absence limit
          {" "}({limitNote}) in the 2026-2027 academic year.
        </p>
      )}

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">
        <p className="font-medium">School rules (summary)</p>
        <ul className="mt-2 list-disc pl-5">
          <li>S.1 to S.5: absence must not exceed 9 days; an alert is issued at 4 days.</li>
          <li>S.6: absence must not exceed 4.5 days; an alert is issued at 2 days.</li>
          <li>
            Combined absence and lateness exceeding 3 occurrences will trigger an automatic alert.
          </li>
          <li>
            Approved leave (medical certificate or parent letter) is not counted towards the
            absence limit and does not affect the attendance rate.
          </li>
          <li>
            Unapproved leave or unexplained absence is counted and will lower the attendance rate.
          </li>
        </ul>
      </div>

      <p className="mt-4 leading-8">
        {isFrequent
          ? `Your child is currently in ${formLabelEn(student.form)}. Please pay attention to attendance. If there is lateness or absence for a special reason, please submit a medical certificate or parent letter to the School Office as soon as possible, and contact the class teacher, ${student.homeroomTeacherName}.`
          : `Your child is currently in ${formLabelEn(student.form)}. The absence limit is ${formatDays(letter.limitDays)} day(s). Please submit supporting documents to the School Office as soon as possible, and contact the class teacher, ${student.homeroomTeacherName}, so that we may follow up together.`}
      </p>

      <p className="mt-4 leading-8">
        {isOver
          ? "As the absence has reached or exceeded the limit, the Student Affairs Office will start follow-up procedures, which may affect academic assessment and related arrangements. If there are special reasons, please notify the school in writing as soon as possible."
          : isFrequent
            ? "This is an advance notice to help avoid reaching the absence limit. If a medical certificate or parent letter is ready, please return it to the School Office for review."
            : "This is an advance notice to help avoid exceeding the limit. If a medical certificate or parent letter is ready, please return it to the School Office for review."}
      </p>

      <p className="mt-4 leading-8">
        Excessive absence may affect promotion to the next form.
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
        <p className="text-sm text-zinc-600">Document no.: {letter.id}</p>
      </div>
    </article>
  );
}
