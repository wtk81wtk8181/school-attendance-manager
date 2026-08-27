"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DailyAbsenceReport } from "@/components/daily-absence-report";
import { buildDailySchoolReport, buildSampleAbsencesPerClass } from "@/lib/daily-report";
import { hongKongToday } from "@/lib/digest";
import { classLabel, formLabel } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { FormLevel } from "@/lib/types";

export default function DailyAbsencePrintPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">正在準備每日缺席報告……</p>
      }
    >
      <DailyAbsencePrintBody />
    </Suspense>
  );
}

function DailyAbsencePrintBody() {
  const { state, visibleStudents, ready } = useStore();
  const searchParams = useSearchParams();
  const schoolDay = searchParams.get("date") ?? hongKongToday();
  const form = searchParams.get("form") ?? "all";
  const klass = searchParams.get("klass") ?? "all";
  const sampleCount = Number(searchParams.get("sample") ?? "0");
  const isSample = Number.isFinite(sampleCount) && sampleCount > 0;
  const filteredStudents = useMemo(
    () =>
      visibleStudents.filter(
        (student) =>
          (form === "all" || String(student.form) === form) &&
          (klass === "all" || student.className === klass)
      ),
    [form, klass, visibleStudents]
  );
  const scope =
    klass !== "all"
      ? classLabel(klass)
      : form !== "all"
        ? formLabel(Number(form) as FormLevel)
        : "全校";

  const payload = useMemo(
    () =>
      buildDailySchoolReport(
        filteredStudents,
        isSample
          ? buildSampleAbsencesPerClass(filteredStudents, schoolDay, sampleCount)
          : state.absences,
        schoolDay,
        state.staffMembers,
        state.staffDailyAbsences,
        scope,
        isSample ? [] : state.staffLeaveRecords,
        isSample ? [] : state.studentLeaveRecords,
        state.hiddenStudents,
        state.hiddenStudentRemovals
      ),
    [
      schoolDay,
      filteredStudents,
      scope,
      isSample,
      sampleCount,
      state.absences,
      state.staffDailyAbsences,
      state.staffLeaveRecords,
      state.studentLeaveRecords,
      state.staffMembers,
      state.hiddenStudents,
      state.hiddenStudentRemovals,
    ]
  );

  useEffect(() => {
    if (!ready || isSample) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [ready, isSample]);

  if (!ready) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        正在從資料庫載入每日缺席報告……
      </p>
    );
  }

  return (
    <div className="daily-school-print min-h-full bg-zinc-200/70 p-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .daily-print-shell {
            width: 281mm;
            height: 194mm;
            max-height: 194mm;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
          }
          .daily-print-shell:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[297mm] flex-wrap items-center justify-between gap-3">
        {isSample ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            版面預覽：每班假設 {sampleCount} 人缺席，不會寫入資料庫。
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[var(--school-navy)] px-3 py-2 text-sm text-white"
        >
          列印／儲存為 PDF
        </button>
      </div>
      <DailyAbsenceReport payload={payload} />
    </div>
  );
}
