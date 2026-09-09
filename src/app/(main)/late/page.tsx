"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, Search } from "lucide-react";
import { AttendanceMark } from "@/components/attendance-mark";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { hongKongToday } from "@/lib/digest";
import { formatDate, formatShortDate } from "@/lib/format";
import { CLASS_STREAMS, CLASS_TEACHERS } from "@/lib/roster";
import {
  attendanceStatusLabel,
  buildStudentStats,
  classLabel,
  formLabel,
  getDayAttendance,
  isDoctorExemptedLate,
  lateOccurrences,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { nextSchoolDate, previousSchoolDate } from "@/lib/hidden-students";
import type { DayAttendance, FormLevel, Student } from "@/lib/types";
import { cn } from "@/lib/utils";

function laterIso(a: string, b: string): string {
  return a >= b ? a : b;
}

export default function LateRecordsPage() {
  const {
    state,
    visibleStudents,
    currentUser,
    setDayAttendance,
    updateAbsenceDetails,
    saveToDatabase,
    pendingSave,
    usingDatabase,
    ready,
  } = useStore();
  const isOffice = currentUser?.role === "office";
  const [query, setQuery] = useState("");
  const [klass, setKlass] = useState<string>(isOffice ? "1A" : "all");
  const [schoolDay, setSchoolDay] = useState(() => hongKongToday());
  const [showAllDates, setShowAllDates] = useState(false);
  const [saving, setSaving] = useState(false);

  const studentById = useMemo(() => {
    const map = new Map(visibleStudents.map((item) => [item.id, item]));
    return map;
  }, [visibleStudents]);

  const classes = useMemo(
    () => [...new Set(visibleStudents.map((item) => item.className))].sort(),
    [visibleStudents]
  );

  useEffect(() => {
    if (klass !== "all" && !classes.includes(klass) && classes.length > 0) {
      setKlass(isOffice ? classes[0] : "all");
    }
  }, [klass, classes, isOffice]);

  const roster = visibleStudents
    .filter((student) => klass === "all" || student.className === klass)
    .filter((student) => {
      const q = query.trim();
      if (!q) return true;
      return (
        student.name.includes(q) ||
        student.nameEn.toLowerCase().includes(q.toLowerCase()) ||
        student.studentNo.includes(q)
      );
    })
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) ||
        a.studentNo.localeCompare(b.studentNo)
    );

  const lateRecords = state.absences
    .filter((item) => item.eclassStatus === "late")
    .filter((item) => showAllDates || item.date === schoolDay)
    .map((item) => {
      const student = studentById.get(item.studentId);
      return student ? { record: item, student } : null;
    })
    .filter((item): item is { record: (typeof state.absences)[number]; student: Student } =>
      Boolean(item)
    )
    .filter(({ student }) => klass === "all" || student.className === klass)
    .filter(({ student }) => {
      const q = query.trim();
      if (!q) return true;
      return (
        student.name.includes(q) ||
        student.nameEn.toLowerCase().includes(q.toLowerCase()) ||
        student.studentNo.includes(q)
      );
    })
    .sort(
      (a, b) =>
        b.record.date.localeCompare(a.record.date) ||
        a.student.className.localeCompare(b.student.className) ||
        a.student.studentNo.localeCompare(b.student.studentNo)
    );

  const selectedDayLate = lateRecords.filter((item) => item.record.date === schoolDay).length;
  const selectedTeacher = klass !== "all" ? CLASS_TEACHERS[klass] : undefined;
  const today = hongKongToday();
  const maxSchoolDay = laterIso(state.academicYear.end, today);
  const previousDay = previousSchoolDate(schoolDay);
  const nextDay = nextSchoolDate(schoolDay);
  const canGoNext = nextDay <= maxSchoolDay;

  async function changeSchoolDay(next: string) {
    if (!next || next === schoolDay) return;
    if (isOffice && pendingSave && usingDatabase) {
      setSaving(true);
      try {
        await saveToDatabase();
      } finally {
        setSaving(false);
      }
    }
    setSchoolDay(next);
  }

  function markLate(
    studentId: string,
    date: string,
    status: DayAttendance,
    extras?: Parameters<typeof setDayAttendance>[3]
  ) {
    const current = getDayAttendance(state.absences, studentId, date);
    if (status === "present" && current !== "present" && current !== "late") {
      return;
    }
    setDayAttendance(studentId, date, status, extras);
  }

  if (!ready) return <PageSkeleton tiles={2} lines={8} />;

  return (
    <PageShell>
      <PageHeader
        title="遲到紀錄"
        description={
          isOffice
            ? "查看學生遲到紀錄，並按班、按上課日記錄遲到。操作與學生出勤頁的「遲到」相同；有醫生證明仍會記錄遲到，但不計入違規次數。標記後請按「確定儲存」。"
            : "查看本班學生遲到紀錄。老師帳號為唯讀。"
        }
      />

      {isOffice ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
            pendingSave
              ? "border-amber-300 bg-amber-50"
              : usingDatabase
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
          )}
        >
          <p className="text-sm">
            {usingDatabase
              ? pendingSave
                ? "已在本機標記遲到，尚未寫入雲端資料庫。"
                : `已與資料庫同步（${state.absences.filter((item) => item.eclassStatus === "late").length} 筆遲到紀錄）。`
              : "此裝置未連接資料庫，另一部電腦看不到這裡的變更。"}
          </p>
          <Button
            disabled={saving || !usingDatabase}
            onClick={() => {
              setSaving(true);
              void saveToDatabase().finally(() => setSaving(false));
            }}
          >
            <Check className="size-4" />
            {saving ? "儲存中……" : "確定儲存"}
          </Button>
        </div>
      ) : null}

      {isOffice ? (
        <section className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              按班登記遲到
              <span className="ml-2 text-xs font-normal text-slate-400">
                選班後可標記該班遲到，與學生出勤頁相同。
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="late-school-day" className="text-xs">
                上課日
              </Label>
              <input
                id="late-school-day"
                type="date"
                className="h-8 w-40 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                max={maxSchoolDay}
                value={schoolDay}
                onChange={(event) => void changeSchoolDay(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3">
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
                          const count = state.students.filter(
                            (student) => student.className === className
                          ).length;
                          return (
                            <button
                              key={className}
                              type="button"
                              onClick={() => setKlass(className)}
                              className={cn(
                                "rounded-md border border-slate-200 px-1.5 py-1 text-center leading-tight transition-colors duration-200 sm:py-0.5",
                                selected
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
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
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {klass !== "all" ? classLabel(klass) : isOffice ? "請先選班" : "本班"}
            {selectedTeacher ? (
              <span className="ml-2 font-normal text-slate-400">
                班主任 {selectedTeacher}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(schoolDay)}　當日遲到 {selectedDayLate} 人
            {showAllDates ? `　列表顯示全部日期（${lateRecords.length} 筆）` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="late-day-record" className="text-sm font-medium">
            上課日
          </Label>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => void changeSchoolDay(previousDay)}
            aria-label="上一個上課日"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <input
            id="late-day-record"
            type="date"
            className="h-8 w-40 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            max={maxSchoolDay}
            value={schoolDay}
            onChange={(event) => void changeSchoolDay(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={!canGoNext}
            onClick={() => void changeSchoolDay(nextDay)}
            aria-label="下一個上課日"
          >
            <ChevronRight className="size-4" />
          </Button>
          {schoolDay !== today ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void changeSchoolDay(today)}
            >
              回到今天
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <Input
            className="pl-8"
            placeholder="搜尋姓名、英文名或學號"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox
            checked={showAllDates}
            onCheckedChange={(checked) => setShowAllDates(checked === true)}
          />
          顯示全部日期的遲到紀錄
        </label>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          {showAllDates ? "遲到紀錄" : "當日遲到紀錄"}
        </h2>
        {lateRecords.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="沒有遲到紀錄"
            description={
              showAllDates
                ? "沒有符合篩選的遲到紀錄。"
                : "這天上課日尚未有遲到紀錄。可在下方名單按「遲到」登記。"
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>班別</TableHead>
                  <TableHead>學生</TableHead>
                  <TableHead>詳情</TableHead>
                  <TableHead>醫生證明</TableHead>
                  <TableHead>學年遲到次數</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lateRecords.map(({ record, student }) => {
                  const stats = buildStudentStats(
                    student,
                    state.absences,
                    state.academicYear.schoolDays
                  );
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatShortDate(record.date)}
                      </TableCell>
                      <TableCell>{classLabel(student.className)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium hover:underline"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {student.studentNo}　{student.nameEn}
                        </p>
                      </TableCell>
                      <TableCell>
                        <AttendanceMark
                          value="late"
                          record={record}
                          disabled={!isOffice}
                          statuses={["present", "late"]}
                          onChange={(status, extras) =>
                            markLate(student.id, record.date, status, extras)
                          }
                          onDetailsChange={(next) =>
                            updateAbsenceDetails(record.id, next)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {isDoctorExemptedLate(record) ? "已交（不計違規）" : "—"}
                      </TableCell>
                      <TableCell>{stats.lateCount} 次</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          登記遲到
          <span className="ml-2 text-sm font-normal text-slate-400">
            {roster.length} 人
          </span>
        </h2>
        {roster.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="沒有符合的學生"
            description="請先選班，或調整搜尋。"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>學生</TableHead>
                  <TableHead>當日出勤（{schoolDay}）</TableHead>
                  <TableHead>學年遲到次數</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((student) => {
                  const dayStatus = getDayAttendance(
                    state.absences,
                    student.id,
                    schoolDay
                  );
                  const record = state.absences.find(
                    (row) => row.studentId === student.id && row.date === schoolDay
                  );
                  const lateCount = lateOccurrences(
                    state.absences.filter((row) => row.studentId === student.id)
                  );
                  return (
                    <TableRow
                      key={student.id}
                      className={dayStatus === "late" ? "bg-sky-50/70" : undefined}
                    >
                      <TableCell>
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium hover:underline"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {student.studentNo}　{student.nameEn}
                          {klass === "all" ? `　${classLabel(student.className)}` : ""}
                        </p>
                        {dayStatus !== "present" && dayStatus !== "late" ? (
                          <p className="mt-1 text-xs text-slate-500">
                            當日已記{attendanceStatusLabel(dayStatus)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <AttendanceMark
                          value={dayStatus}
                          record={record}
                          disabled={!isOffice}
                          statuses={["present", "late"]}
                          onChange={(status, extras) =>
                            markLate(student.id, schoolDay, status, extras)
                          }
                          onDetailsChange={(next) => {
                            if (record) updateAbsenceDetails(record.id, next);
                          }}
                        />
                      </TableCell>
                      <TableCell>{lateCount} 次</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
