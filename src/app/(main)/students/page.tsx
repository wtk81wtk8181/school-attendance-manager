"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { AttendanceMark } from "@/components/attendance-mark";
import { EmptyState } from "@/components/empty-state";
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
import type { FormLevel, StudentStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StudentsPage() {
  const { state, visibleStudents, currentUser, setDayAttendance } = useStore();
  const isOffice = currentUser?.role === "office";
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<string>("all");
  const [klass, setKlass] = useState<string>(isOffice ? "1A" : "all");
  const [level, setLevel] = useState<string>("all");
  const [schoolDay, setSchoolDay] = useState(hongKongToday);

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
  const selectedDayPresent = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "present"
  ).length;
  const selectedDayAbsent = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "absent"
  ).length;
  const selectedDayLeave = rows.filter(
    (item) => getDayAttendance(state.absences, item.student.id, schoolDay) === "leave"
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {currentUser?.role === "homeroom" ? "本班學生出勤" : "學生出勤"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOffice
            ? "請先選班，再為該班每位學生標記當日出席、缺席或事假。點選姓名可查看缺席日期與文件。"
            : "點選學生可查看缺席日期、文件與審核狀態。老師帳號為唯讀，可更換班別。"}
        </p>
      </div>

      {isOffice ? (
        <section className="space-y-3 rounded-xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium">按班點名</p>
              <p className="text-xs text-muted-foreground">
                全校中一至中六各有 A 至 E 班。選班後可編輯該班每位學生的當日狀態。
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="school-day">上課日</Label>
              <Input
                id="school-day"
                type="date"
                className="w-44"
                value={schoolDay}
                onChange={(event) => setSchoolDay(event.target.value)}
              />
            </div>
          </div>
          {FORMS.map((item) => (
            <div key={item} className="space-y-1.5">
              <p className="text-xs font-medium text-[var(--school-navy)]">
                {formLabel(item)}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
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
                        "rounded-lg border px-2 py-2 text-left transition-colors",
                        selected
                          ? "border-[var(--school-navy)] bg-[var(--school-navy)] text-white"
                          : "bg-[var(--school-paper)] hover:bg-muted"
                      )}
                    >
                      <span className="block text-sm font-semibold">
                        {classLabel(className)}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px]",
                          selected ? "text-white/75" : "text-muted-foreground"
                        )}
                      >
                        {count} 人
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
          　上課日 {schoolDay}：出席 {selectedDayPresent}　缺席 {selectedDayAbsent}　事假{" "}
          {selectedDayLeave}
        </p>
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
                          disabled={!isOffice}
                          onChange={(status) =>
                            setDayAttendance(item.student.id, schoolDay, status)
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
