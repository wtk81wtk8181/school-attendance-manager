"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  STUDENT_LEAVE_CATEGORIES,
  formatStudentLeaveLine,
  studentLeaveCategoryLabel,
  studentLeavesForDate,
  studentMatchesQuery,
} from "@/lib/student-leave";
import { classLabel, listClasses } from "@/lib/rules";
import { visibleRosterStudents } from "@/lib/hidden-students";
import { useStore } from "@/lib/store";
import type { StudentLeaveCategory } from "@/lib/types";
import { toast } from "sonner";

export function StudentLeaveSection({ date }: { date: string }) {
  const { state, addStudentLeaves, removeStudentLeave } = useStore();
  const [open, setOpen] = useState(false);
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [category, setCategory] = useState<StudentLeaveCategory>("official");
  const [status, setStatus] = useState<"leave" | "absent">("leave");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [reason, setReason] = useState("");
  const [activity, setActivity] = useState("");

  const roster = useMemo(
    () =>
      visibleRosterStudents(
        state.students,
        state.hiddenStudents,
        state.hiddenStudentRemovals
      ),
    [state.hiddenStudentRemovals, state.hiddenStudents, state.students]
  );
  const classes = useMemo(() => listClasses(roster), [roster]);
  const filteredStudents = useMemo(
    () =>
      roster
        .filter(
          (student) =>
            (classFilter === "all" || student.className === classFilter) &&
            studentMatchesQuery(student, query)
        )
        .sort(
          (a, b) =>
            a.className.localeCompare(b.className) ||
            a.studentNo.localeCompare(b.studentNo)
        ),
    [classFilter, query, roster]
  );
  const selectedSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);
  const dayLeaves = studentLeavesForDate(state.studentLeaveRecords, date);
  const upcomingLeaves = (state.studentLeaveRecords ?? [])
    .filter((item) => item.endDate >= date)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  function resetForm() {
    setSelectedStudentIds([]);
    setReason("");
    setActivity("");
  }

  function openDialog() {
    setStartDate(date);
    setEndDate(date);
    resetForm();
    setOpen(true);
  }

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedStudentIds((current) =>
      checked ? [...new Set([...current, studentId])] : current.filter((id) => id !== studentId)
    );
  }

  function selectAllFiltered() {
    setSelectedStudentIds(filteredStudents.map((student) => student.id));
  }

  function submitLeave(event: FormEvent) {
    event.preventDefault();
    if (selectedStudentIds.length === 0) {
      toast.error("請至少選擇一名學生。");
      return;
    }
    const { added, skipped } = addStudentLeaves({
      studentIds: selectedStudentIds,
      category,
      status,
      startDate,
      endDate: endDate || startDate,
      reason,
      activity,
    });
    if (added === 0) {
      if (skipped === 0) {
        toast.error("未能登記請假，請重試。");
      }
      return;
    }
    setOpen(false);
    resetForm();
    toast.success(
      added === 1
        ? "已登記 1 名學生的預先請假，到日會自動顯示於缺席名單。"
        : `已為 ${added} 名學生登記同一活動的預先請假，到日會自動顯示於缺席名單。`
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">學生預先請假</p>
          <p className="text-xs text-muted-foreground">
            可一次為多名學生登記同一活動、同一日期的預先請假；到日會自動顯示於總覽及每日缺席報告。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openDialog}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>登記學生預先請假</DialogTitle>
            <DialogDescription>
              可一次選擇多名學生，登記同一活動及日期範圍。若當日未有其他缺席紀錄，系統會自動顯示於缺席名單。
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitLeave}>
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
              <Label htmlFor="student-leave-activity">外出活動／比賽</Label>
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

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>選擇學生（已選 {selectedStudentIds.length} 人）</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="xs" onClick={selectAllFiltered}>
                    全選目前列表
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedStudentIds([])}
                  >
                    清除
                  </Button>
                </div>
              </div>
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
              <ScrollArea className="h-56 rounded-md border">
                <div className="space-y-1 p-2">
                  {filteredStudents.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      找不到符合條件的學生。
                    </p>
                  ) : (
                    filteredStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={selectedSet.has(student.id)}
                          onCheckedChange={(checked) =>
                            toggleStudent(student.id, checked === true)
                          }
                        />
                        <span className="text-sm">
                          {classLabel(student.className)}　{student.name}（{student.studentNo}）
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={selectedStudentIds.length === 0}>
                {selectedStudentIds.length <= 1
                  ? "登記請假"
                  : `批量登記 ${selectedStudentIds.length} 人`}
              </Button>
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
