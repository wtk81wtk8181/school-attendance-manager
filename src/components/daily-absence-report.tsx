import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import { formatPercentExact } from "@/lib/format";
import { STAFF_ABSENCE_ROWS } from "@/lib/staff";
import type { DailyClassBlock, DailySchoolReportPayload } from "@/lib/daily-report";

export function DailyAbsenceReport({
  payload,
}: {
  payload: DailySchoolReportPayload;
}) {
  const left = payload.classes.slice(0, 15);
  const right = payload.classes.slice(15, 30);

  return (
    <article className="daily-school-sheet mx-auto bg-white text-zinc-900">
      <header className="border-b-2 border-[var(--school-navy)] pb-2 text-center">
        <p className="text-[10px] tracking-[0.28em] text-[var(--school-gold)]">
          {SCHOOL_NAME_EN}
        </p>
        <h1 className="mt-0.5 font-serif text-xl tracking-widest text-[var(--school-navy)] sm:text-2xl">
          {SCHOOL_NAME}
        </h1>
        <h2 className="mt-1 text-base font-semibold">學生缺席每日報告表</h2>
        <p className="mt-0.5 text-sm">{payload.dateLabel}</p>
      </header>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <ClassColumn title="中一至中三" blocks={left} />
        <ClassColumn title="中四至中六" blocks={right} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded border border-zinc-300 p-2">
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
            {payload.staffLeaveLines.length > 0 && (
              <div className="mt-2 border-t border-dashed border-zinc-300 pt-1.5">
                <p className="font-medium">教職員提早請假：</p>
                {payload.staffLeaveLines.map((line) => (
                  <p key={line} className="text-zinc-700">{line}</p>
                ))}
              </div>
            )}
            {payload.studentLeaveLines.length > 0 && (
              <div className="mt-2 border-t border-dashed border-zinc-300 pt-1.5">
                <p className="font-medium">學生預先請假：</p>
                {payload.studentLeaveLines.map((line) => (
                  <p key={line} className="text-zinc-700">{line}</p>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-x-auto rounded border border-zinc-300">
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
                <td className="border border-zinc-300 px-1 py-1 text-left">
                  學生出席百分比
                </td>
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
      </div>

      <div className="mt-3 space-y-3">
        <ClassMetricsTable
          title="中一至中三"
          classes={payload.classes.slice(0, 15)}
          totalLabel="小計"
          totals={{
            absent: payload.classes.slice(0, 15).reduce((sum, item) => sum + item.absentCount, 0),
            attendanceRate: summarizeAttendance(payload.classes.slice(0, 15)),
            late: payload.classes.slice(0, 15).reduce((sum, item) => sum + item.lateCount, 0),
            punctualityRate: summarizePunctuality(payload.classes.slice(0, 15)),
          }}
        />
        <ClassMetricsTable
          title="中四至中六"
          classes={payload.classes.slice(15, 30)}
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

function summarizeAttendance(classes: DailyClassBlock[]): number {
  const registered = classes.reduce((sum, item) => sum + item.registered, 0);
  const present = classes.reduce((sum, item) => sum + item.present, 0);
  if (registered <= 0) return 1;
  return present / registered;
}

function summarizePunctuality(classes: DailyClassBlock[]): number {
  const present = classes.reduce((sum, item) => sum + item.present, 0);
  const late = classes.reduce((sum, item) => sum + item.lateCount, 0);
  if (present <= 0) return 1;
  return Math.max(0, present - late) / present;
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
      <table className="w-full border-collapse text-center text-[10px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-zinc-300 px-1 py-1 text-left">班別</th>
            {classes.map((item) => (
              <th key={item.className} className="border border-zinc-300 px-0.5 py-1">
                {item.className}
              </th>
            ))}
            <th className="border border-zinc-300 px-1 py-1">{totalLabel}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">缺席人數</td>
            {classes.map((item) => (
              <td key={item.className} className="border border-zinc-300 px-0.5 py-1">
                {item.absentCount || ""}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1">{totals.absent}</td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">出席百分比</td>
            {classes.map((item) => (
              <td key={item.className} className="border border-zinc-300 px-0.5 py-1">
                {formatPercentExact(item.attendanceRate)}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1">
              {formatPercentExact(totals.attendanceRate)}
            </td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">學生遲到人數</td>
            {classes.map((item) => (
              <td key={item.className} className="border border-zinc-300 px-0.5 py-1">
                {item.lateCount}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1">{totals.late}</td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-1 text-left">守時百分比</td>
            {classes.map((item) => (
              <td key={item.className} className="border border-zinc-300 px-0.5 py-1">
                {formatPercentExact(item.punctualityRate)}
              </td>
            ))}
            <td className="border border-zinc-300 px-1 py-1">
              {formatPercentExact(totals.punctualityRate)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function ClassColumn({
  title,
  blocks,
}: {
  title: string;
  blocks: DailyClassBlock[];
}) {
  return (
    <section>
      <h3 className="mb-1 text-center text-sm font-semibold">{title}</h3>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-100 text-center">
            <th className="border border-zinc-300 px-1 py-1">班別代碼</th>
            <th className="border border-zinc-300 px-1 py-1">課室容額</th>
            <th className="border border-zinc-300 px-1 py-1">出席</th>
            <th className="border border-zinc-300 px-1 py-1">早退</th>
            <th className="border border-zinc-300 px-1 py-1 text-left">缺席名單及原因</th>
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
                {block.absenceLines.length > 0 ? (
                  block.absenceLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))
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
