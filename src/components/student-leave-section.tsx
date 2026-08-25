"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  STUDENT_LEAVE_CATEGORIES,
  formatStudentLeaveLine,
  studentLeaveCategoryLabel,
  studentLeavesForDate,
  studentMatchesQuery,
} from "@/lib/student-leave";
import { classLabel, listClasses } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { StudentLeaveCategory } from "@/lib/types";
import { toast } from "sonner";

export function StudentLeaveSection({ date }: { date: string }) {
  const { state, addStudentLeave, removeStudentLeave } = useStore();
  const [open, setOpen] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState<StudentLeaveCategory>("personal");
  const [status, setStatus] = useState<"leave" | "absent">("leave");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [reason, setReason] = useState("");
  const [activity, setActivity] = useState("");

  const classes = useMemo(() => listClasses(state.students), [state.students]);
  const filteredStudents = useMemo(
    () =>
      state.students
        .filter(
          (student) =>
            (classFilter === "all" || student.className === classFilter) &&
            studentMatchesQuery(student, query)
        )
        .slice(0, 80),
    [classFilter, query, state.students]
  );
  const dayLeaves = studentLeavesForDate(state.studentLeaveRecords, date);
  const upcomingLeaves = (state.studentLeaveRecords ?? [])
    .filter((item) => item.endDate >= date)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  function submitLeave(event: FormEvent) {
    event.preventDefault();
    if (!studentId) {
      toast.error("請先選擇學生。");
      return;
    }
    const ok = addStudentLeave({
      studentId,
      category,
      status,
      startDate,
      endDate: endDate || startDate,
      reason,
      activity,
    });
    if (!ok) {
      toast.error("未能登記請假，請重試。");
      return;
    }
    setOpen(false);
    setStudentId("");
    setReason("");
    setActivity("");
    toast.success("已登記學生預先請假，到日會自動顯示於缺席名單。");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">學生預先請假</p>
          <p className="text-xs text-muted-foreground">
            可預先登記事假、病假、公假／比賽等；到請假當日會自動顯示於總覽及每日缺席報告。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <CalendarPlus className="size-4" />
          登記學生請假
        </Button>
      </div>

      {dayLeaves.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
          <p className="text-sm font-medium text-sky-950">當日已登記的預先請假</p>
          <ul className="mt-1 space-y-1 text-sm text-sky-950">
            {dayLeaves.map((leave) => (
              <li key={leave.id}>{formatStudentLeaveLine(leave)}</li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>登記學生預先請假</DialogTitle>
            <DialogDescription>
              選擇學生、類別及日期範圍。若當日未有其他缺席紀錄，系統會自動顯示於缺席名單。
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitLeave}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>班別篩選</Label>
                <Select value={classFilter} onValueChange={(value) => setClassFilter(value ?? "all")}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="student-search">搜尋</Label>
                <Input
                  id="student-search"
                  value={query}
                  placeholder="姓名、學號或班別"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>學生</Label>
              <Select value={studentId} onValueChange={(value) => setStudentId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇學生" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {classLabel(student.className)}　{student.name}（{student.studentNo}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>類別</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as StudentLeaveCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_LEAVE_CATEGORIES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>當日狀態</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus((value as "leave" | "absent") ?? "leave")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leave">請假</SelectItem>
                    <SelectItem value="absent">缺席</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="student-leave-start">開始日期</Label>
                <Input
                  id="student-leave-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="student-leave-end">結束日期</Label>
                <Input
                  id="student-leave-end"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="student-leave-activity">外出活動／比賽（選填）</Label>
              <Input
                id="student-leave-activity"
                value={activity}
                placeholder="例如：學界游泳、境外交流"
                onChange={(event) => setActivity(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="student-leave-reason">原因（選填）</Label>
              <Input
                id="student-leave-reason"
                value={reason}
                placeholder={studentLeaveCategoryLabel(category)}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">登記請假</Button>
            </DialogFooter>
          </form>

          {upcomingLeaves.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">已登記的請假（{upcomingLeaves.length}）</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {upcomingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p>{formatStudentLeaveLine(leave)}</p>
                      <p className="text-xs text-muted-foreground">
                        {leave.startDate}
                        {leave.endDate !== leave.startDate ? ` 至 ${leave.endDate}` : ""}
                        　{leave.status === "leave" ? "請假" : "缺席"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStudentLeave(leave.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
