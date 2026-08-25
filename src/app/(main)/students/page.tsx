"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users, Check } from "lucide-react";
import { AttendanceMark } from "@/components/attendance-mark";
import { EmptyState } from "@/components/empty-state";
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
import { formatPercent } from "@/lib/format";
import { CLASS_STREAMS, CLASS_TEACHERS, FORMS } from "@/lib/roster";
import {
  buildStudentStats,
  classLabel,
  formatDays,
  formLabel,
  getDayAttendance,
  progressPercent,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { isStudentHidden } from "@/lib/hidden-students";
import type { FormLevel, StudentStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StudentsPage() {
  const { state, visibleStudents, currentUser, setDayAttendance, saveToDatabase, pendingSave, usingDatabase, restoreHiddenStudent } =
    useStore();
  const isOffice = currentUser?.role === "office";
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<string>("all");
  const [klass, setKlass] = useState<string>(isOffice ? "1A" : "all");
  const [level, setLevel] = useState<string>("all");
  const [schoolDay, setSchoolDay] = useState(() => hongKongToday());
  const [saving, setSaving] = useState(false);

  const classes = useMemo(
    () => [...new Set(visibleStudents.map((item) => item.className))].sort(),
    [visibleStudents]
  );

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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {currentUser?.role === "homeroom" ? "本班學生出勤" : "學生出勤"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOffice
            ? "請先選班，再為該班每位學生標記當日出席、缺席、遲到、事假、半日缺席或早退。標記後請按「確定儲存」，另一部裝置才會看到。"
            : "點選學生可查看缺席日期、文件與審核狀態。老師帳號為唯讀，可更換班別。"}
        </p>
      </div>

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
        <section className="space-y-2 rounded-xl border bg-white px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              按班點名
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                選班後可編輯該班當日狀態
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="school-day" className="text-xs">
                上課日
              </Label>
              <Input
                id="school-day"
                type="date"
                className="h-8 w-40"
                value={schoolDay}
                onChange={(event) => setSchoolDay(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            {FORMS.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <p className="w-9 shrink-0 text-[11px] font-medium text-[var(--school-navy)]">
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
                          "rounded-md border px-1.5 py-0.5 text-center leading-tight transition-colors",
                          selected
                            ? "border-[var(--school-navy)] bg-[var(--school-navy)] text-white"
                            : "bg-[var(--school-paper)] hover:bg-muted"
                        )}
                      >
                        <span className="text-xs font-semibold">{classLabel(className)}</span>
                        <span
                          className={cn(
                            "ml-1 text-[10px]",
                            selected ? "text-white/75" : "text-muted-foreground"
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
        </section>
      ) : null}

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="搜尋姓名、英文名或學號"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {isOffice ? null : (
          <>
            <Select value={form} onValueChange={(value) => setForm(value ?? "all")}>
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
            <Input
              type="date"
              className="w-full md:w-44"
              value={schoolDay}
              onChange={(event) => setSchoolDay(event.target.value)}
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
        <p className="text-sm text-muted-foreground">
          {klass !== "all" ? classLabel(klass) : "本班"}
          {selectedTeacher ? `　班主任 ${selectedTeacher}` : ""}
          　上課日 {schoolDay}：出席 {selectedDayPresent}　缺席 {selectedDayAbsent}　半日缺席{" "}
          {selectedDayHalf}　遲到 {selectedDayLate}　事假 {selectedDayLeave}　早退 {selectedDayEarly}
          {hiddenInView.length > 0 ? `　已隱藏 ${hiddenInView.length} 人` : ""}
        </p>
      ) : null}

      {isOffice && hiddenInView.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">
            連續七天缺席而隱藏的學生（已從該班人數扣除）
          </p>
          <ul className="mt-2 space-y-2">
            {hiddenInView.map((item) => (
              <li
                key={item.studentId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-950"
              >
                <span>
                  {classLabel(item.className)}　{item.studentName}同學已連續七天缺席
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
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {CLASS_TEACHERS[className] ?? ""}　{items.length} 人
                </span>
              </h2>
            </div>
            <div className="rounded-xl border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>當日出勤</TableHead>
                    <TableHead>出席率</TableHead>
                    <TableHead>計入缺席</TableHead>
                    <TableHead>獲批請假</TableHead>
                    <TableHead>待審核</TableHead>
                    <TableHead>狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.student.id}>
                      <TableCell>
                        <Link
                          href={`/students/${item.student.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.student.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {item.student.studentNo}　{item.student.nameEn}
                        </p>
                      </TableCell>
                      <TableCell>
                        <AttendanceMark
                          value={getDayAttendance(
                            state.absences,
                            item.student.id,
                            schoolDay
                          )}
                          record={state.absences.find(
                            (row) =>
                              row.studentId === item.student.id && row.date === schoolDay
                          )}
                          disabled={!isOffice}
                          onChange={(status, extras) =>
                            setDayAttendance(item.student.id, schoolDay, status, extras)
                          }
                        />
                      </TableCell>
                      <TableCell>{formatPercent(item.attendanceRate)}</TableCell>
                      <TableCell>
                        <div className="w-36">
                          <div className="mb-1 flex justify-between text-xs">
                            <span>{formatDays(item.countedDays)} 天</span>
                            <span className="text-muted-foreground">
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
