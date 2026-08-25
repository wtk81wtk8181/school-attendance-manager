"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DailyAbsenceReport } from "@/components/daily-absence-report";
import { buildDailySchoolReport } from "@/lib/daily-report";
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
  const { state, visibleStudents } = useStore();
  const searchParams = useSearchParams();
  const schoolDay = searchParams.get("date") ?? hongKongToday();
  const form = searchParams.get("form") ?? "all";
  const klass = searchParams.get("klass") ?? "all";
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
        state.absences,
        schoolDay,
        state.staffMembers,
        state.staffDailyAbsences,
        scope,
        state.staffLeaveRecords,
        state.studentLeaveRecords
      ),
    [
      schoolDay,
      filteredStudents,
      scope,
      state.absences,
      state.staffDailyAbsences,
      state.staffLeaveRecords,
      state.studentLeaveRecords,
      state.staffMembers,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="daily-school-print min-h-full bg-zinc-200/70 p-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[297mm] justify-end">
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
