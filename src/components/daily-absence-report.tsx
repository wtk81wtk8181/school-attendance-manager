import { SCHOOL_NAME, SCHOOL_NAME_EN } from "@/lib/seed";
import { formatDate } from "@/lib/format";
import type { DailyAbsenceRow } from "@/lib/daily-report";

export function DailyAbsenceReport({
  schoolDay,
  rows,
  scope,
}: {
  schoolDay: string;
  rows: DailyAbsenceRow[];
  scope: string;
}) {
  return (
    <article className="letter-sheet mx-auto bg-white text-zinc-900">
      <header className="border-b-2 border-[var(--school-navy)] pb-4 text-center">
        <p className="text-xs tracking-[0.3em] text-[var(--school-gold)]">
          {SCHOOL_NAME_EN}
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-widest text-[var(--school-navy)]">
          {SCHOOL_NAME}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">校務處　學生出勤事務</p>
        <h2 className="mt-4 text-xl font-semibold tracking-wide">每日缺席報告</h2>
        <p className="mt-2 text-sm">上課日：{formatDate(schoolDay)}</p>
        <p className="text-xs text-zinc-500">範圍：{scope}</p>
      </header>

      <p className="mt-6 text-sm leading-7">
        下列為該上課日缺席或請假學生名單，包括請假原因、致電到校人士及致電時間，供校務處存檔及跟進。
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">該日沒有缺席或請假紀錄。</p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--school-navy)] text-left">
              <th className="py-2 pr-2 font-semibold">班別</th>
              <th className="py-2 pr-2 font-semibold">學生姓名</th>
              <th className="py-2 pr-2 font-semibold">請假／缺席原因</th>
              <th className="py-2 pr-2 font-semibold">致電到校人士</th>
              <th className="py-2 font-semibold">致電時間</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-200 align-top">
                <td className="py-2.5 pr-2">{row.classLabel}</td>
                <td className="py-2.5 pr-2">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-zinc-500">
                    {row.studentNo}　{row.status}
                    {row.days === 0.5 ? "（半日）" : ""}
                  </p>
                </td>
                <td className="py-2.5 pr-2">{row.reason}</td>
                <td className="py-2.5 pr-2">{row.calledBy}</td>
                <td className="py-2.5 whitespace-nowrap">{row.calledAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
        <p>缺席 {rows.filter((item) => item.status === "缺席").length} 人</p>
        <p>請假 {rows.filter((item) => item.status === "請假").length} 人</p>
        <p>合計 {rows.length} 人</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-10 text-sm">
        <p>校務處核對：____________________</p>
        <p>日期：____________________</p>
      </div>
    </article>
  );
}
