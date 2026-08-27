"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Lock, Percent, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  appearanceMonthOptions,
  buildAppearanceReport,
  hasAppearanceIssue,
} from "@/lib/appearance-report";
import { downloadBase64Xlsx, requestAppearanceReport } from "@/lib/digest-client";
import { formatPercentExact } from "@/lib/format";
import { currentYearMonth } from "@/lib/monthly-report";
import { CLASS_STREAMS, CLASS_TEACHERS } from "@/lib/roster";
import { classLabel, filterClassNames, formLabel } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FormLevel, Student } from "@/lib/types";
import { toast } from "sonner";

export default function AppearancePage() {
  const {
    currentUser,
    state,
    visibleStudents,
    toggleAppearanceIssue,
    ready,
  } = useStore();
  const isOffice = currentUser?.role === "office";
  const months = useMemo(
    () => appearanceMonthOptions(state.academicYear.start, state.academicYear.end),
    [state.academicYear.end, state.academicYear.start]
  );
  const [month, setMonth] = useState(() => {
    const now = currentYearMonth();
    return months.includes(now) ? now : (months[0] ?? now);
  });
  const [form, setForm] = useState("all");
  const [klass, setKlass] = useState<string>(isOffice ? "1A" : "all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const classes = useMemo(() => {
    const all = [...new Set(visibleStudents.map((item) => item.className))].sort();
    return filterClassNames(all, form);
  }, [visibleStudents, form]);

  useEffect(() => {
    if (form !== "all" && klass !== "all" && !classes.includes(klass)) {
      setKlass("all");
    }
  }, [form, klass, classes]);

  const report = useMemo(
    () =>
      buildAppearanceReport(
        state.students,
        state.absences,
        state.appearanceIssues,
        state.appearanceIssueRemovals,
        month,
        state.academicYear.label
      ),
    [
      month,
      state.absences,
      state.academicYear.label,
      state.appearanceIssueRemovals,
      state.appearanceIssues,
      state.students,
    ]
  );

  const rows = visibleStudents
    .filter((student) => {
      const q = query.trim();
      const matchQuery =
        q.length === 0 ||
        student.name.includes(q) ||
        student.nameEn.toLowerCase().includes(q.toLowerCase()) ||
        student.studentNo.includes(q);
      const matchForm = form === "all" || String(student.form) === form;
      const matchClass = klass === "all" || student.className === klass;
      return matchQuery && matchForm && matchClass;
    })
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) || a.studentNo.localeCompare(b.studentNo)
    );

  const grouped = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const student of rows) {
      const list = map.get(student.className) ?? [];
      list.push(student);
      map.set(student.className, list);
    }
    return [...map.entries()];
  }, [rows]);

  const selectedSummary = klass === "all" ? report.totals : report.classes.find((item) => item.className === klass);
  const selectedTeacher = klass !== "all" ? CLASS_TEACHERS[klass] : undefined;

  if (!ready) return <PageSkeleton tiles={2} lines={8} />;

  if (currentUser?.role !== "office" && currentUser?.role !== "homeroom") {
    return (
      <PageShell>
        <EmptyState
          icon={Lock}
          title="沒有檢視權限"
          description="校服儀容由校務處按班標記。"
        />
      </PageShell>
    );
  }

  async function exportReport() {
    setBusy(true);
    try {
      const result = await requestAppearanceReport({
        payload: report,
        sendEmail: false,
        recipients: [],
      });
      downloadBase64Xlsx(result.filename, result.fileBase64);
      toast.success(`已產生 ${result.filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法產生儀容百分率報告。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell wide>
      <PageHeader
        title="校服儀容"
        description="請先選班，再標記該月儀容有問題的學生。未標記視為儀容正常；各班儀容正常百分率＝正常人數÷班人數，匯出報告時會自動套用。"
        actions={
          isOffice ? (
            <Button disabled={busy} onClick={() => void exportReport()}>
              <Download className="size-4" />
              {busy ? "產生中……" : "產生 Excel"}
            </Button>
          ) : null
        }
      />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid max-w-xs flex-1 gap-1.5">
            <Label htmlFor="appearance-month">月份</Label>
            <Input
              id="appearance-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || currentYearMonth())}
            />
          </div>
          {selectedSummary ? (
            <p className="text-sm text-slate-600">
              {klass !== "all" ? classLabel(klass) : "全校"}
              {selectedTeacher ? `　班主任 ${selectedTeacher}` : ""}
              　{selectedSummary.studentCount} 人　有問題 {selectedSummary.issueCount} 人　儀容正常{" "}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatPercentExact(selectedSummary.appearanceRate)}
              </span>
            </p>
          ) : null}
        </div>

        {isOffice ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              按班顯示
              <span className="ml-2 text-xs font-normal text-slate-400">
                選班後只顯示該班名單，方便逐人標記。
              </span>
            </p>
            {(
              [
                { label: "初中", forms: [1, 2, 3] as FormLevel[] },
                { label: "高中", forms: [4, 5, 6] as FormLevel[] },
              ] as const
            ).map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-slate-400">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.forms.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <p className="w-9 shrink-0 text-[11px] font-medium text-slate-600">
                        {formLabel(item)}
                      </p>
                      <div className="grid min-w-0 flex-1 grid-cols-5 gap-1">
                        {CLASS_STREAMS.map((stream) => {
                          const className = `${item}${stream}`;
                          const selected = klass === className;
                          const classRow = report.classes.find((row) => row.className === className);
                          const count = state.students.filter(
                            (student) => student.className === className
                          ).length;
                          return (
                            <button
                              key={className}
                              type="button"
                              onClick={() => {
                                setForm("all");
                                setKlass(className);
                              }}
                              className={cn(
                                "rounded-md border border-slate-200 px-1.5 py-1 text-center leading-tight transition-colors duration-200 sm:py-0.5",
                                selected
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                              )}
                            >
                              <span className="text-xs font-semibold">{classLabel(className)}</span>
                              <span
                                className={cn(
                                  "ml-1 text-[10px]",
                                  selected ? "text-white/75" : "text-slate-400"
                                )}
                              >
                                {count}
                              </span>
                              {classRow && classRow.issueCount > 0 ? (
                                <span
                                  className={cn(
                                    "mt-0.5 block text-[10px] tabular-nums",
                                    selected ? "text-amber-200" : "text-amber-700"
                                  )}
                                >
                                  正常 {formatPercentExact(classRow.appearanceRate, 0)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setKlass("all")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-200",
                klass === "all"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
              )}
            >
              全部班別
            </button>
          </div>
        ) : null}
      </section>

      <div className="relative">
        <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
        <Input
          className="pl-8"
          placeholder="搜尋姓名、英文名或學號"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="沒有符合的學生"
          description="請先選班，或調整搜尋。"
        />
      ) : (
        grouped.map(([className, items]) => {
          const classRow = report.classes.find((item) => item.className === className);
          const issueCount = items.filter((student) =>
            hasAppearanceIssue(
              state.appearanceIssues,
              state.appearanceIssueRemovals,
              student.id,
              month
            )
          ).length;
          return (
            <section key={className} className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-base font-semibold">
                  {classLabel(className)}
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    {CLASS_TEACHERS[className] ?? ""}　{items.length} 人　有問題 {issueCount} 人
                  </span>
                </h2>
                <p className="text-sm tabular-nums text-slate-600">
                  儀容正常 {formatPercentExact(classRow?.appearanceRate ?? 1)}
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>學生</TableHead>
                      <TableHead>班別</TableHead>
                      <TableHead>該月儀容</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((student) => {
                      const issue = hasAppearanceIssue(
                        state.appearanceIssues,
                        state.appearanceIssueRemovals,
                        student.id,
                        month
                      );
                      return (
                        <TableRow key={student.id} className={issue ? "bg-amber-50/80" : undefined}>
                          <TableCell>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-slate-400">
                              {student.studentNo}　{student.nameEn}
                            </p>
                          </TableCell>
                          <TableCell>{classLabel(student.className)}</TableCell>
                          <TableCell>
                            <div className="inline-flex rounded-lg border bg-white p-0.5">
                              <button
                                type="button"
                                disabled={!isOffice}
                                onClick={() => toggleAppearanceIssue(student.id, month, false)}
                                className={cn(
                                  "h-8 min-w-16 rounded-md px-2 text-xs font-semibold transition-colors duration-200",
                                  !issue
                                    ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-900",
                                  !isOffice && "cursor-default opacity-80"
                                )}
                              >
                                正常
                              </button>
                              <button
                                type="button"
                                disabled={!isOffice}
                                onClick={() => toggleAppearanceIssue(student.id, month, true)}
                                className={cn(
                                  "h-8 min-w-16 rounded-md px-2 text-xs font-semibold transition-colors duration-200",
                                  issue
                                    ? "bg-amber-600 text-white hover:bg-amber-600"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-900",
                                  !isOffice && "cursor-default opacity-80"
                                )}
                              >
                                有問題
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          );
        })
      )}
    </PageShell>
  );
}
