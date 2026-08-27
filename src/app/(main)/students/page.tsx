"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users, Check } from "lucide-react";
import { AttendanceMark } from "@/components/attendance-mark";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell, PageSkeleton } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hongKongToday } from "@/lib/digest";
import { formatDate, formatPercent } from "@/lib/format";
import { CLASS_STREAMS, CLASS_TEACHERS } from "@/lib/roster";
import {
  buildStudentStats,
  classLabel,
  countedAbsenceDaysOnOrBefore,
  filterClassNames,
  formatDays,
  formatNameWithCountedDays,
  formLabel,
  getDayAttendance,
  progressPercent,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { isStudentHidden, nextSchoolDate, previousSchoolDate } from "@/lib/hidden-students";
import type { FormLevel, StudentStats } from "@/lib/types";
import { cn } from "@/lib/utils";

function laterIso(a: string, b: string): string {
  return a >= b ? a : b;
}

export default function StudentsPage() {
  const {
    state,
    visibleStudents,
    currentUser,
    setDayAttendance,
    updateAbsenceDetails,
    saveToDatabase,
    pendingSave,
    usingDatabase,
    restoreHiddenStudent,
    ready,
  } = useStore();
  const isOffice = currentUser?.role === "office";
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<string>("all");
  const [klass, setKlass] = useState<string>(isOffice ? "1A" : "all");
  const [level, setLevel] = useState<string>("all");
  const [schoolDay, setSchoolDay] = useState(() => hongKongToday());
  const [saving, setSaving] = useState(false);

  const classes = useMemo(() => {
    const all = [...new Set(visibleStudents.map((item) => item.className))].sort();
    return filterClassNames(all, form);
  }, [visibleStudents, form]);

  useEffect(() => {
    if (form !== "all" && klass !== "all" && !classes.includes(klass)) {
      setKlass("all");
    }
  }, [form, klass, classes]);

  const rows = visibleStudents
    .map((student) =>
      buildStudentStats(student, state.absences, state.academicYear.schoolDays)
    )
    .filter((item) => {
      const q = query.trim();
      const matchQuery =
        q.length === 0 ||
        item.student.name.includes(q) ||
        item.student.nameEn.toLowerCase().includes(q.toLowerCase()) ||
        item.student.studentNo.includes(q);
      const matchForm = form === "all" || String(item.student.form) === form;
      const matchClass = klass === "all" || item.student.className === klass;
      const matchLevel = level === "all" || item.level === level;
      return matchQuery && matchForm && matchClass && matchLevel;
    })
    .sort(
      (a, b) =>
        a.student.className.localeCompare(b.student.className) ||
        a.student.studentNo.localeCompare(b.student.studentNo)
    );

  const grouped = useMemo(() => {
    const map = new Map<string, StudentStats[]>();
    for (const item of rows) {
      const list = map.get(item.student.className) ?? [];
      list.push(item);
      map.set(item.student.className, list);
    }
    return [...map.entries()];
  }, [rows]);

  const selectedTeacher = klass !== "all" ? CLASS_TEACHERS[klass] : undefined;
  const hiddenInView = (state.hiddenStudents ?? []).filter(
    (item) =>
      isStudentHidden(state.hiddenStudents, state.hiddenStudentRemovals, item.studentId) &&
      (klass === "all" || item.className === klass) &&
      (form === "all" || item.className.startsWith(form))
  );
  const selectedDayPresent = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "present"
  ).length;
  const selectedDayAbsent = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "absent"
  ).length;
  const selectedDayLeave = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "leave"
  ).length;
  const selectedDayLate = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "late"
  ).length;
  const selectedDayHalf = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "half_absent"
  ).length;
  const selectedDayEarly = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "early"
  ).length;
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

  if (!ready) return <PageSkeleton tiles={4} lines={8} />;

  return (
    <PageShell>
      <PageHeader
        title={currentUser?.role === "homeroom" ? "本班學生出勤" : "學生出勤"}
        description={
          isOffice
            ? "請先選班，再選擇上課日（包括已過去的日子），為該班標記出席、缺席、遲到、事假、半日缺席或早退。標記後請按「確定儲存」。"
            : "點選學生可查看缺席日期、文件與審核狀態。老師帳號為唯讀，可更換班別。"
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
                ? "已在本機標記出勤，尚未寫入雲端資料庫。"
                : `已與資料庫同步（${state.absences.length} 筆缺席紀錄）。`
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
              按班點名
              <span className="ml-2 text-xs font-normal text-slate-400">
                選班後可標記該班出勤。已過去的上課日仍可改選並補記，按「確定儲存」寫入平台。
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="school-day" className="text-xs">
                上課日
              </Label>
              <input
                id="school-day"
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
        {isOffice ? null : (
          <>
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
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="年級" />
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
            <Select value={klass} onValueChange={(value) => setKlass(value ?? "all")}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="班別" />
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
          </>
        )}
        {isOffice ? null : (
          <div className="grid gap-1.5">
            <input
              type="date"
              className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none md:w-44 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              max={maxSchoolDay}
              value={schoolDay}
              onChange={(event) => void changeSchoolDay(event.target.value)}
              aria-label="上課日"
            />
          </div>
        )}
        <Select value={level} onValueChange={(value) => setLevel(value ?? "all")}>
          <SelectTrigger className="w-full md:w-36">
            <SelectValue placeholder="狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="ok">正常</SelectItem>
            <SelectItem value="warning">預警</SelectItem>
            <SelectItem value="over">超過上限</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {klass !== "all" ? classLabel(klass) : "本班"}
              {selectedTeacher ? (
                <span className="ml-2 font-normal text-slate-400">
                  班主任 {selectedTeacher}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {formatDate(schoolDay)}
              {isOffice
                ? "　可改選過往上課日補記出勤；標記後請按「確定儲存」寫入平台"
                : "　可改選上課日檢視該日紀錄（唯讀）"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="school-day-record" className="text-sm font-medium">
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
              id="school-day-record"
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
      ) : null}

      {rows.length > 0 ? (
        <p className="text-sm text-slate-400">
          {schoolDay}：出席 {selectedDayPresent}　缺席 {selectedDayAbsent}　半日缺席{" "}
          {selectedDayHalf}　遲到 {selectedDayLate}　事假 {selectedDayLeave}　早退 {selectedDayEarly}
          {hiddenInView.length > 0 ? `　已隱藏 ${hiddenInView.length} 人` : ""}
        </p>
      ) : null}

      {isOffice && hiddenInView.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">
            連續七個上課日缺席（不計星期六、日），需向教育局申報 Form A；已從該班學生總人數扣除
          </p>
          <ul className="mt-2 space-y-2">
            {hiddenInView.map((item) => (
              <li
                key={item.studentId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-950"
              >
                <span>
                  {classLabel(item.className)}　{item.studentName}同學已連續七個上課日缺席
                  {item.lastAbsentDate ? `（至 ${item.lastAbsentDate}）` : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => restoreHiddenStudent(item.studentId)}
                >
                  加回名單
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="沒有符合的學生"
          description="請調整搜尋、班別或狀態篩選。"
        />
      ) : (
        grouped.map(([className, items]) => (
          <section key={className} className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <h2 className="text-base font-semibold">
                {classLabel(className)}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {CLASS_TEACHERS[className] ?? ""}　{items.length} 人
                </span>
              </h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>當日出勤（{schoolDay}）</TableHead>
                    <TableHead>出席率</TableHead>
                    <TableHead>計入缺席</TableHead>
                    <TableHead>獲批請假</TableHead>
                    <TableHead>待審核</TableHead>
                    <TableHead>狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const dayStatus = getDayAttendance(
                      state.absences,
                      item.student.id,
                      schoolDay
                    );
                    const countedUpTo = countedAbsenceDaysOnOrBefore(
                      state.absences.filter((row) => row.studentId === item.student.id),
                      schoolDay
                    );
                    const showCountedDays =
                      dayStatus === "absent" ||
                      dayStatus === "leave" ||
                      dayStatus === "half_absent";
                    return (
                    <TableRow key={item.student.id}>
                      <TableCell>
                        <Link
                          href={`/students/${item.student.id}`}
                          className="font-medium hover:underline"
                        >
                          {showCountedDays
                            ? formatNameWithCountedDays(item.student.name, countedUpTo)
                            : item.student.name}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {item.student.studentNo}　{item.student.nameEn}
                        </p>
                      </TableCell>
                      <TableCell>
                        <AttendanceMark
                          value={dayStatus}
                          record={state.absences.find(
                            (row) =>
                              row.studentId === item.student.id && row.date === schoolDay
                          )}
                          disabled={!isOffice}
                          onChange={(status, extras) =>
                            setDayAttendance(item.student.id, schoolDay, status, extras)
                          }
                          onDetailsChange={(next) => {
                            const record = state.absences.find(
                              (row) =>
                                row.studentId === item.student.id &&
                                row.date === schoolDay
                            );
                            if (record) updateAbsenceDetails(record.id, next);
                          }}
                        />
                      </TableCell>
                      <TableCell>{formatPercent(item.attendanceRate)}</TableCell>
                      <TableCell>
                        <div className="w-36">
                          <div className="mb-1 flex justify-between text-xs">
                            <span>{formatDays(item.countedDays)} 天</span>
                            <span className="text-slate-400">
                              / {formatDays(item.limit)}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                item.level === "over"
                                  ? "bg-rose-600"
                                  : item.level === "warning"
                                    ? "bg-amber-500"
                                    : "bg-emerald-600"
                              )}
                              style={{
                                width: `${progressPercent(item.countedDays, item.limit)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDays(item.approvedLeaveDays)} 天</TableCell>
                      <TableCell>{formatDays(item.pendingDays)} 天</TableCell>
                      <TableCell>
                        <LevelBadge level={item.level} />
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        ))
      )}
    </PageShell>
  );
}
