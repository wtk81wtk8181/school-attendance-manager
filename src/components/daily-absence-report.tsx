import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import { formatPercentExact } from "@/lib/format";
import {
  pdfAbsenceColumnCount,
  pdfAbsenceFontSize,
  splitAbsenceLinesIntoColumns,
} from "@/lib/daily-absence-display";
import { STAFF_ABSENCE_ROWS } from "@/lib/staff";
import type { DailyClassBlock, DailySchoolReportPayload } from "@/lib/daily-report";

export function DailyAbsenceReport({
  payload,
}: {
  payload: DailySchoolReportPayload;
}) {
  return (
    <>
      <div className="daily-print-shell">
        <DailyJuniorReportPage payload={payload} className="daily-print-page" />
      </div>
      <div className="daily-print-shell">
        <DailySeniorReportPage payload={payload} className="daily-print-page" />
      </div>
    </>
  );
}

export function DailyJuniorReportPage({
  payload,
  className = "",
}: {
  payload: DailySchoolReportPayload;
  className?: string;
}) {
  const junior = payload.classes.slice(0, 15);

  return (
    <article
      className={`daily-school-sheet mx-auto bg-white text-zinc-900 ${className}`.trim()}
    >
      <ReportHeader payload={payload} sectionTitle="中一至中三" />

      <div className="mt-3">
        <ClassTable blocks={junior} />
      </div>

      <StaffSection payload={payload} />
    </article>
  );
}

export function DailySeniorReportPage({
  payload,
  className = "",
}: {
  payload: DailySchoolReportPayload;
  className?: string;
}) {
  const senior = payload.classes.slice(15, 30);

  return (
    <article
      className={`daily-school-sheet mx-auto bg-white text-zinc-900 ${className}`.trim()}
    >
      <ReportHeader payload={payload} sectionTitle="中四至中六" />

      <div className="mt-3">
        <ClassTable blocks={senior} />
      </div>

      <div className="mt-3 space-y-2 print:mt-2 print:space-y-1">
        <FormStatsTable payload={payload} />
        <ClassMetricsTable
          title="中四至中六"
          classes={senior}
          totalLabel="TOTAL"
          totals={{
            absent: payload.totalAbsent,
            attendanceRate: payload.totalAttendanceRate,
            late: payload.totalLate,
            punctualityRate: payload.schoolPunctualityRate,
          }}
        />
      </div>
    </article>
  );
}

function ReportHeader({
  payload,
  sectionTitle,
}: {
  payload: DailySchoolReportPayload;
  sectionTitle: string;
}) {
  return (
    <header className="border-b-2 border-[var(--school-navy)] pb-2 text-center">
      <p className="text-[10px] tracking-[0.28em] text-[var(--school-gold)]">
        {SCHOOL_NAME_EN}
      </p>
      <h1 className="mt-0.5 font-serif text-xl tracking-widest text-[var(--school-navy)] sm:text-2xl">
        {SCHOOL_NAME}
      </h1>
      <h2 className="mt-1 text-base font-semibold">學生缺席每日報告表</h2>
      <p className="mt-0.5 text-sm">{payload.dateLabel}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--school-navy)]">{sectionTitle}</p>
    </header>
  );
}

function StaffSection({ payload }: { payload: DailySchoolReportPayload }) {
  return (
    <section className="mt-4 rounded border border-zinc-300 p-2">
      <h3 className="text-sm font-semibold">教職員缺席情況</h3>
      <div className="mt-2 space-y-1.5 text-xs">
        {STAFF_ABSENCE_ROWS.map((row) => (
          <p key={row.kind}>
            <span className="font-medium">{row.label}：</span>
            {payload.staff[row.kind].length > 0
              ? payload.staff[row.kind].join("、")
              : "—"}
          </p>
        ))}
      </div>
    </section>
  );
}

function FormStatsTable({ payload }: { payload: DailySchoolReportPayload }) {
  return (
    <section className="overflow-x-auto rounded border border-zinc-300 print:overflow-visible">
      <table className="w-full border-collapse text-center text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-zinc-300 px-1 py-1 text-left">級別</th>
            {payload.formStats.map((item) => (
              <th key={item.form} className="border border-zinc-300 px-1 py-1">
                {item.label}
              </th>
            ))}
            <th className="border border-zinc-300 px-1 py-1">總數</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">學生出席人數</td>
            {payload.formStats.map((item) => (
              <td key={item.form} className="border border-zinc-300 px-1 py-1">
                {item.present}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1 font-medium">
              {payload.totalPresent}
            </td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">學生註冊人數</td>
            {payload.formStats.map((item) => (
              <td key={item.form} className="border border-zinc-300 px-1 py-1">
                {item.registered}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1 font-medium">
              {payload.totalRegistered}
            </td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">學生出席百分比</td>
            {payload.formStats.map((item) => (
              <td key={item.form} className="border border-zinc-300 px-1 py-1">
                {formatPercentExact(item.attendanceRate)}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1 font-medium">
              {formatPercentExact(payload.totalAttendanceRate)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function ClassMetricsTable({
  title,
  classes,
  totalLabel,
  totals,
}: {
  title: string;
  classes: DailyClassBlock[];
  totalLabel: string;
  totals: {
    absent: number;
    attendanceRate: number;
    late: number;
    punctualityRate: number;
  };
}) {
  return (
    <section className="rounded border border-zinc-300">
      <h3 className="border-b border-zinc-300 bg-slate-50 px-2 py-1 text-center text-xs font-semibold">
        {title}
      </h3>
      <table className="w-full table-fixed border-collapse text-center text-[10px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="w-24 whitespace-nowrap border border-zinc-300 px-1 py-1 text-left">
              班別
            </th>
            {classes.map((item) => (
              <th key={item.className} className="whitespace-nowrap border border-zinc-300 px-0.5 py-1">
                {item.className}
              </th>
            ))}
            <th className="whitespace-nowrap border border-zinc-300 px-1 py-1">{totalLabel}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1 text-left">
              缺席人數
            </td>
            {classes.map((item) => (
              <td key={item.className} className="whitespace-nowrap border border-zinc-300 px-0.5 py-1">
                {item.absentCount}
              </td>
            ))}
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1">{totals.absent}</td>
          </tr>
          <tr>
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1 text-left">
              出席百分比
            </td>
            {classes.map((item) => (
              <td key={item.className} className="whitespace-nowrap border border-zinc-300 px-0.5 py-1">
                {formatPercentExact(item.attendanceRate)}
              </td>
            ))}
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1">
              {formatPercentExact(totals.attendanceRate)}
            </td>
          </tr>
          <tr>
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1 text-left">
              遲到人數
            </td>
            {classes.map((item) => (
              <td key={item.className} className="whitespace-nowrap border border-zinc-300 px-0.5 py-1">
                {item.lateCount}
              </td>
            ))}
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1">{totals.late}</td>
          </tr>
          <tr>
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1 text-left">
              守時百分比
            </td>
            {classes.map((item) => (
              <td key={item.className} className="whitespace-nowrap border border-zinc-300 px-0.5 py-1">
                {formatPercentExact(item.punctualityRate)}
              </td>
            ))}
            <td className="whitespace-nowrap border border-zinc-300 px-1 py-1">
              {formatPercentExact(totals.punctualityRate)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function AbsenceLinesCell({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return <span className="text-zinc-400">—</span>;
  }

  const columnCount = pdfAbsenceColumnCount(lines.length);
  const fontSize = pdfAbsenceFontSize(lines.length);
  const columns = splitAbsenceLinesIntoColumns(lines, columnCount);

  if (columnCount === 1) {
    return (
      <div style={{ fontSize }}>
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className="leading-tight">
            {line}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-1"
      style={{
        fontSize,
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((column, columnIndex) => (
        <div key={columnIndex}>
          {column.map((line, index) => (
            <p key={`${columnIndex}-${index}`} className="leading-tight">
              {line}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function ClassTable({ blocks }: { blocks: DailyClassBlock[] }) {
  return (
    <section>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-100 text-center">
            <th className="border border-zinc-300 px-1 py-1">班別代碼</th>
            <th className="border border-zinc-300 px-1 py-1">學生總人數</th>
            <th className="border border-zinc-300 px-1 py-1">出席</th>
            <th className="border border-zinc-300 px-1 py-1">早退</th>
            <th className="border border-zinc-300 px-1 py-1 text-left">缺席名單及原因</th>
            <th className="border border-zinc-300 px-1 py-1 text-left">新生插班名單</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <tr key={block.className} className="align-top">
              <td className="border border-zinc-300 px-1 py-1 text-center font-medium">
                {block.className}
              </td>
              <td className="border border-zinc-300 px-1 py-1 text-center">
                {block.registered || ""}
              </td>
              <td className="border border-zinc-300 px-1 py-1 text-center">{block.present}</td>
              <td className="border border-zinc-300 px-1 py-1 text-center">
                {block.earlyLeave || ""}
              </td>
              <td className="border border-zinc-300 px-1 py-1">
                <AbsenceLinesCell lines={block.absenceLines} />
              </td>
              <td className="border border-zinc-300 px-1 py-1">
                {block.enrollNames.length > 0 ? (
                  block.enrollNames.join("、")
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
