"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileUser, Printer } from "lucide-react";
import { StudentAbsenceReportPreview } from "@/components/student-absence-report-sheet";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { hongKongToday } from "@/lib/digest";
import { classLabel, filterClassNames, formLabel } from "@/lib/rules";
import { allClassNames } from "@/lib/roster";
import { buildStudentAbsenceReport, classNumberFromStudentNo } from "@/lib/student-absence-report";
import { studentMatchesQuery } from "@/lib/student-leave";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FormLevel, Student } from "@/lib/types";

export default function StudentReportsPage() {
  const { state, visibleStudents, ready } = useStore();
  const today = hongKongToday();
  const yearStart = state.academicYear.start;
  const yearEnd = state.academicYear.end;
  const defaultDate = today < yearStart ? yearStart : today > yearEnd ? yearEnd : today;

  const [form, setForm] = useState("all");
  const [klass, setKlass] = useState("all");
  const [query, setQuery] = useState("");
  const [reportDate, setReportDate] = useState(defaultDate);
  const [studentId, setStudentId] = useState<string | null>(null);

  const classes = useMemo(() => {
    const names = [...new Set(visibleStudents.map((item) => item.className))];
    const order = new Map(allClassNames().map((name, index) => [name, index]));
    return filterClassNames(names, form).sort(
      (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99)
    );
  }, [visibleStudents, form]);

  useEffect(() => {
    if (klass !== "all" && !classes.includes(klass)) setKlass("all");
  }, [classes, klass]);

  const listedStudents = useMemo(() => {
    const order = new Map(allClassNames().map((name, index) => [name, index]));
    return visibleStudents
      .filter((student) => form === "all" || String(student.form) === form)
      .filter((student) => klass === "all" || student.className === klass)
      .filter((student) => studentMatchesQuery(student, query))
      .sort((a, b) => {
        const classDiff = (order.get(a.className) ?? 99) - (order.get(b.className) ?? 99);
        if (classDiff) return classDiff;
        const numberDiff =
          Number(classNumberFromStudentNo(a.studentNo)) -
          Number(classNumberFromStudentNo(b.studentNo));
        if (numberDiff) return numberDiff;
        return a.name.localeCompare(b.name, "zh-HK");
      });
  }, [visibleStudents, form, klass, query]);

  const showList = klass !== "all" || query.trim().length > 0;
  const selected = visibleStudents.find((student) => student.id === studentId) ?? null;
  const selectedIndex = listedStudents.findIndex((student) => student.id === studentId);
  const previous = selectedIndex > 0 ? listedStudents[selectedIndex - 1] : null;
  const next =
    selectedIndex >= 0 && selectedIndex < listedStudents.length - 1
      ? listedStudents[selectedIndex + 1]
      : null;

  useEffect(() => {
    if (!studentId) return;
    document.getElementById(`student-report-pick-${studentId}`)?.scrollIntoView({
      block: "nearest",
    });
  }, [studentId]);

  const report = useMemo(() => {
    if (!selected) return null;
    return buildStudentAbsenceReport({
      student: selected,
      absences: state.absences,
      academicYear: state.academicYear,
      reportDate,
      hiddenStudents: state.hiddenStudents,
      hiddenRemovals: state.hiddenStudentRemovals,
      clearedAttendance: state.clearedAttendance,
      studentLeaves: state.studentLeaveRecords,
    });
  }, [
    selected,
    state.absences,
    state.academicYear,
    state.hiddenStudents,
    state.hiddenStudentRemovals,
    state.clearedAttendance,
    state.studentLeaveRecords,
    reportDate,
  ]);

  if (!ready) return <PageSkeleton lines={8} />;

  return (
    <PageShell wide className="print:space-y-0">
      <div className="no-print space-y-6">
        <PageHeader
          title="個別學生報告"
          description="選擇一名學生，即可預覽並列印該生本學年的缺席報告。全日缺席或事假會拆成上午、下午兩節缺課，半日缺席列上午一節，遲到列在上午。早退按離開時間列出，並把 0.5 日計入缺課；上午早退會同時列下午缺課。同日的遲到不會令這 0.5 日變成豁免。缺席或早退須完成批准才標為豁免；已交醫生紙的遲到會標為豁免。豁免項目仍會列出，並在摘要扣除。"
          actions={
            <>
              <Button
                variant="outline"
                disabled={!previous}
                onClick={() => previous && setStudentId(previous.id)}
              >
                <ChevronLeft />
                上一位
              </Button>
              <Button
                variant="outline"
                disabled={!next}
                onClick={() => next && setStudentId(next.id)}
              >
                下一位
                <ChevronRight />
              </Button>
              <Button disabled={!report} onClick={() => window.print()}>
                <Printer />
                列印這份報告
              </Button>
            </>
          }
        />

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-1.5">
            <Label>年級</Label>
            <Select
              value={form}
              onValueChange={(value) => {
                const nextForm = value ?? "all";
                setForm(nextForm);
                if (nextForm !== "all" && klass !== "all" && klass[0] !== nextForm) {
                  setKlass("all");
                }
              }}
            >
              <SelectTrigger className="w-full">
                <span>{form === "all" ? "全部年級" : formLabel(Number(form) as FormLevel)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年級</SelectItem>
                {([1, 2, 3, 4, 5, 6] as FormLevel[]).map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {formLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>班別</Label>
            <Select value={klass} onValueChange={(value) => setKlass(value ?? "all")}>
              <SelectTrigger className="w-full">
                <span>{klass === "all" ? "全部班別" : classLabel(klass)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部班別</SelectItem>
                {classes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {classLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="student-report-query">搜尋學生</Label>
            <Input
              id="student-report-query"
              value={query}
              placeholder="姓名、英文姓名或學號"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="student-report-date">報告日期</Label>
            <Input
              id="student-report-date"
              type="date"
              min={yearStart}
              max={yearEnd}
              value={reportDate}
              onChange={(event) => {
                const next = event.target.value;
                if (next) setReportDate(next);
              }}
            />
          </div>
        </section>
      </div>

      <style>{`
        @media print {
          .student-report-layout {
            display: block !important;
            margin: 0 !important;
          }
        }
      `}</style>
      <div className="student-report-layout grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="no-print overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-2 text-sm text-slate-600">
            {showList ? `共 ${listedStudents.length} 人` : "學生名單"}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {!showList ? (
              <p className="px-2 py-6 text-center text-sm leading-relaxed text-slate-500">
                請先選擇班別，或輸入姓名、學號搜尋。
              </p>
            ) : listedStudents.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">沒有符合的學生。</p>
            ) : (
              listedStudents.map((student) => (
                <StudentPickButton
                  key={student.id}
                  student={student}
                  selected={student.id === studentId}
                  onSelect={() => setStudentId(student.id)}
                />
              ))
            )}
          </div>
        </aside>

        <div className="min-w-0 print:col-span-2">
          {report ? (
            <StudentAbsenceReportPreview report={report} />
          ) : (
            <div className="no-print">
              <EmptyState
                icon={FileUser}
                title="尚未選擇學生"
                description="在左方名單揀選一名學生，即可查看並列印該生的缺席報告。"
              />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function StudentPickButton({
  student,
  selected,
  onSelect,
}: {
  student: Student;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      id={`student-report-pick-${student.id}`}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-baseline justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        selected ? "bg-slate-900 text-white" : "hover:bg-slate-100"
      )}
    >
      <span className="min-w-0">
        <span className="font-medium">
          {classLabel(student.className)}({classNumberFromStudentNo(student.studentNo)}){" "}
          {student.name}
        </span>
      </span>
      <span
        className={cn(
          "max-w-[46%] truncate text-[11px]",
          selected ? "text-white/75" : "text-slate-400"
        )}
      >
        {student.nameEn}
      </span>
    </button>
  );
}
