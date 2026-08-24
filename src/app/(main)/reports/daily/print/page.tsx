"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DailyAbsenceReport } from "@/components/daily-absence-report";
import { buildDailyAbsenceRows } from "@/lib/daily-report";
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
  const schoolDay = searchParams.get("date") ?? state.academicYear.end;
  const form = searchParams.get("form") ?? "all";
  const klass = searchParams.get("klass") ?? "all";

  const students = visibleStudents.filter((student) => {
    const matchForm = form === "all" || String(student.form) === form;
    const matchClass = klass === "all" || student.className === klass;
    return matchForm && matchClass;
  });

  const rows = useMemo(
    () => buildDailyAbsenceRows(students, state.absences, schoolDay),
    [schoolDay, state.absences, students]
  );

  const scope =
    klass !== "all"
      ? classLabel(klass)
      : form !== "all"
        ? formLabel(Number(form) as FormLevel)
        : "全校";

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-full bg-zinc-200/70 p-4 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[var(--school-navy)] px-3 py-2 text-sm text-white"
        >
          列印／儲存為 PDF
        </button>
      </div>
      <DailyAbsenceReport schoolDay={schoolDay} rows={rows} scope={scope} />
    </div>
  );
}
