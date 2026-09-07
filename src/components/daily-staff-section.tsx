"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, Check, Plus, Search, Trash2, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STAFF_ABSENCE_ROWS,
  STAFF_LEAVE_CATEGORIES,
  applyStaffLeavesToDaily,
  staffDailyFor,
  staffIdsForKind,
  staffLeaveCategoryLabel,
  staffLeavesForDate,
} from "@/lib/staff";
import { useStore } from "@/lib/store";
import type { StaffAbsenceKind, StaffLeaveCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DragSelection {
  kind: StaffAbsenceKind;
  selected: boolean;
  ids: Set<string>;
}

interface ReasonPrompt {
  kind: StaffAbsenceKind;
  staffIds: string[];
  names: string[];
}

export function DailyStaffSection({ date }: { date: string }) {
  const {
    currentUser,
    state,
    addStaffMember,
    addStaffMembers,
    removeStaffMember,
    addStaffLeave,
    removeStaffLeave,
    toggleStaffAbsences,
  } = useStore();
  const canEdit = currentUser?.role === "office";
  const [open, setOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [search, setSearch] = useState("");
  const [leaveStaffId, setLeaveStaffId] = useState("");
  const [leaveCategory, setLeaveCategory] = useState<StaffLeaveCategory>("checkup");
  const [leaveStart, setLeaveStart] = useState(date);
  const [leaveEnd, setLeaveEnd] = useState(date);
  const [leaveNote, setLeaveNote] = useState("");
  const [leaveActivity, setLeaveActivity] = useState("");
  const [reasonPrompt, setReasonPrompt] = useState<ReasonPrompt | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [dragPreview, setDragPreview] = useState<DragSelection | null>(null);
  const dragRef = useRef<DragSelection | null>(null);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    kind: StaffAbsenceKind;
    staffId: string;
    currentlySelected: boolean;
  } | null>(null);
  const ignoreNextClickRef = useRef(false);
  const promptGuardRef = useRef(0);

  const members = state.staffMembers ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase("zh-HK");
  const filteredMembers = normalizedSearch
    ? members.filter((member) =>
        member.name.toLocaleLowerCase("zh-HK").includes(normalizedSearch)
      )
    : members;
  const dayLeaves = staffLeavesForDate(state.staffLeaveRecords, date);
  const daily = applyStaffLeavesToDaily(
    staffDailyFor(state.staffDailyAbsences, date),
    dayLeaves,
    ""
  );
  const upcomingLeaves = (state.staffLeaveRecords ?? [])
    .filter((item) => item.endDate >= date)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const askLeaveReason = useCallback(
    (kind: StaffAbsenceKind, ids: string[]) => {
      const uniqueIds = [...new Set(ids)];
      const names = members
        .filter((member) => uniqueIds.includes(member.id))
        .map((member) => member.name);
      const draft =
        uniqueIds.length === 1
          ? daily.selectionChanges?.[uniqueIds[0]]?.reason ?? ""
          : "";
      promptGuardRef.current = Date.now();
      window.setTimeout(() => {
        setReasonDraft(draft);
        setReasonPrompt({ kind, staffIds: uniqueIds, names });
      }, 50);
    },
    [daily.selectionChanges, members]
  );

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const start = pointerStartRef.current;
      if (!start || !canEdit) return;
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (!dragRef.current) {
        if (distance < 8) return;
        const drag = {
          kind: start.kind,
          selected: !start.currentlySelected,
          ids: new Set([start.staffId]),
        };
        dragRef.current = drag;
        setDragPreview(drag);
        return;
      }
      event.preventDefault();
    }

    function onPointerUp() {
      const drag = dragRef.current;
      pointerStartRef.current = null;
      dragRef.current = null;
      setDragPreview(null);
      if (!drag) return;
      ignoreNextClickRef.current = true;
      window.setTimeout(() => {
        ignoreNextClickRef.current = false;
      }, 0);
      const ids = [...drag.ids];
      if (!drag.selected) {
        toggleStaffAbsences(date, drag.kind, ids, false);
        return;
      }
      askLeaveReason(drag.kind, ids);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [askLeaveReason, canEdit, date, toggleStaffAbsences]);

  function extendDrag(kind: StaffAbsenceKind, staffId: string) {
    const drag = dragRef.current;
    if (!drag || drag.kind !== kind || drag.ids.has(staffId)) return;
    drag.ids.add(staffId);
    setDragPreview({ ...drag, ids: new Set(drag.ids) });
  }

  function submitName(event: FormEvent) {
    event.preventDefault();
    if (!addStaffMember(name)) {
      toast.error(name.trim() ? "此教職員名稱已在名單中。" : "請輸入教職員名稱。");
      return;
    }
    setName("");
    toast.success("已加入教職員名單。");
  }

  function submitBulk(event: FormEvent) {
    event.preventDefault();
    const names = bulkNames.split(/[\n,;、]+/);
    const added = addStaffMembers(names);
    if (added === 0) {
      toast.error("沒有可加入的新名稱（可能已存在或格式空白）。");
      return;
    }
    setBulkNames("");
    toast.success(`已批量加入 ${added} 位教職員。`);
  }

  function submitLeave(event: FormEvent) {
    event.preventDefault();
    if (!leaveStaffId) {
      toast.error("請先選擇教職員。");
      return;
    }
    if (!leaveStart) {
      toast.error("請選擇開始日期。");
      return;
    }
    const ok = addStaffLeave({
      staffId: leaveStaffId,
      category: leaveCategory,
      startDate: leaveStart,
      endDate: leaveEnd || leaveStart,
      note: leaveNote,
      activity: leaveActivity,
    });
    if (!ok) {
      toast.error("未能登記請假，請重試。");
      return;
    }
    setLeaveOpen(false);
    setLeaveStaffId("");
    setLeaveNote("");
    setLeaveActivity("");
    toast.success("已登記提早請假，到日會自動顯示於每日缺席名單。");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">教職員缺席情況</p>
          <p className="text-xs text-muted-foreground">
            名單已載入文件傳閱教職員姓名。可按住姓名拖過多人一次選取；同一人只會出現在其中一行。
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)}>
              <CalendarPlus className="size-4" />
              提早登記請假
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Users className="size-4" />
              編輯教職員名單
            </Button>
          </div>
        ) : null}
      </div>

      {dayLeaves.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">當日已登記的提早請假</p>
          <ul className="mt-1 space-y-1 text-sm text-amber-900">
            {dayLeaves.map((leave) => (
              <li key={leave.id}>
                {leave.staffName}（{staffLeaveCategoryLabel(leave.category)}
                {leave.activity.trim() ? `：${leave.activity.trim()}` : ""}）
                {leave.note.trim() ? `　備註：${leave.note.trim()}` : ""}
                {leave.startDate !== leave.endDate
                  ? `　${leave.startDate} 至 ${leave.endDate}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          尚未有教職員名稱。請先開啟對話框新增，例如校長、主任或當日缺席的同事。
        </p>
      ) : (
        <div className="space-y-3 rounded-xl border bg-white p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜尋教職員姓名"
              className="pl-8"
            />
          </div>
          {STAFF_ABSENCE_ROWS.map((row) => {
            const selected = new Set(staffIdsForKind(daily, row.kind));
            return (
              <div key={row.kind} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium">{row.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filteredMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">找不到符合的姓名。</p>
                  ) : (
                    filteredMembers.map((member) => {
                      const previewed =
                        dragPreview?.kind === row.kind &&
                        dragPreview.ids.has(member.id);
                      const checked = previewed
                        ? dragPreview.selected
                        : selected.has(member.id);
                      return (
                        <button
                          key={`${row.kind}-${member.id}`}
                          type="button"
                          disabled={!canEdit}
                          aria-pressed={checked}
                          onPointerDown={(event) => {
                            if (!canEdit || event.button !== 0) return;
                            pointerStartRef.current = {
                              x: event.clientX,
                              y: event.clientY,
                              kind: row.kind,
                              staffId: member.id,
                              currentlySelected: selected.has(member.id),
                            };
                          }}
                          onPointerEnter={() => extendDrag(row.kind, member.id)}
                          onClick={() => {
                            if (!canEdit) return;
                            if (ignoreNextClickRef.current) {
                              ignoreNextClickRef.current = false;
                              return;
                            }
                            if (selected.has(member.id)) {
                              toggleStaffAbsences(date, row.kind, [member.id], false);
                              return;
                            }
                            askLeaveReason(row.kind, [member.id]);
                          }}
                          onDragStart={(event) => event.preventDefault()}
                          className={cn(
                            "flex select-none items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                            checked
                              ? "border-[var(--school-navy)] bg-[var(--school-navy)] text-white"
                              : "bg-white hover:bg-muted",
                            canEdit ? "cursor-pointer" : "cursor-default opacity-75"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded border",
                              checked
                                ? "border-white/70 bg-white/15"
                                : "border-input bg-white"
                            )}
                          >
                            {checked ? <Check className="size-3" /> : null}
                          </span>
                          {member.name}
                          {checked && daily.selectionChanges?.[member.id]?.reason ? (
                            <span className="text-[11px] opacity-80">
                              {daily.selectionChanges[member.id]?.reason}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>教職員名稱</DialogTitle>
            <DialogDescription>
              可逐一新增，或把學校提供的名單整批貼上（每行一人，亦可用逗號、頓號分隔）。
            </DialogDescription>
          </DialogHeader>
          <form className="flex gap-2" onSubmit={submitName}>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="staff-name">教職員名稱</Label>
              <Input
                id="staff-name"
                value={name}
                placeholder="例如：陳大文"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button type="submit" className="mt-6">
              <Plus className="size-4" />
              新增
            </Button>
          </form>
          <form className="space-y-2" onSubmit={submitBulk}>
            <Label htmlFor="staff-bulk">批量匯入（每行一人）</Label>
            <Textarea
              id="staff-bulk"
              value={bulkNames}
              placeholder={"陳大文\n李小明\n黃 Sir\n程 Sir\nCindy"}
              rows={4}
              onChange={(event) => setBulkNames(event.target.value)}
            />
            <Button type="submit" variant="secondary" size="sm">
              <Plus className="size-4" />
              批量加入
            </Button>
          </form>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">名單仍是空的。</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>{member.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStaffMember(member.id)}
                  >
                    刪除
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>提早登記教職員請假</DialogTitle>
            <DialogDescription>
              可預先輸入病假、公假、複診等；原因會顯示於每日缺席報告。超過兩天會一併列出請假日子。
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitLeave}>
            <div className="grid gap-1.5">
              <Label>教職員</Label>
              <Select
                value={leaveStaffId}
                onValueChange={(value) => setLeaveStaffId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇教職員" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>類別</Label>
              <Select
                value={leaveCategory}
                onValueChange={(value) => setLeaveCategory(value as StaffLeaveCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_LEAVE_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="leave-start">開始日期</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={leaveStart}
                  onChange={(event) => setLeaveStart(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="leave-end">結束日期</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={leaveEnd}
                  onChange={(event) => setLeaveEnd(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="leave-note">請假原因</Label>
              <Input
                id="leave-note"
                value={leaveNote}
                placeholder="例如：發燒、覆診、家庭事務"
                onChange={(event) => setLeaveNote(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="leave-activity">外出活動／比賽（選填）</Label>
              <Input
                id="leave-activity"
                value={leaveActivity}
                placeholder="例如：學界田徑比賽、境外交流團、下午講座"
                onChange={(event) => setLeaveActivity(event.target.value)}
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
                      <p>
                        {leave.staffName}　{staffLeaveCategoryLabel(leave.category)}
                        {leave.activity.trim() ? `：${leave.activity.trim()}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leave.startDate}
                        {leave.endDate !== leave.startDate ? ` 至 ${leave.endDate}` : ""}
                        {leave.note.trim() ? `　${leave.note.trim()}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStaffLeave(leave.id)}
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

      {reasonPrompt && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
              onMouseDown={() => {
                if (Date.now() - promptGuardRef.current < 300) return;
              }}
            >
              <div
                className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl ring-1 ring-black/10"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <p className="text-lg font-semibold text-slate-900">請假原因</p>
                <p className="mt-1 text-sm text-slate-600">
                  請輸入 {reasonPrompt.names.join("、")} 的請假原因，會顯示於每日缺席報告。
                </p>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    toggleStaffAbsences(
                      date,
                      reasonPrompt.kind,
                      reasonPrompt.staffIds,
                      true,
                      reasonDraft
                    );
                    setReasonPrompt(null);
                    setReasonDraft("");
                  }}
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="staff-day-reason">請假原因</Label>
                    <Input
                      id="staff-day-reason"
                      value={reasonDraft}
                      placeholder="例如：發燒、覆診、講座"
                      autoFocus
                      onChange={(event) => setReasonDraft(event.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        toggleStaffAbsences(
                          date,
                          reasonPrompt.kind,
                          reasonPrompt.staffIds,
                          true
                        );
                        setReasonPrompt(null);
                        setReasonDraft("");
                      }}
                    >
                      略過
                    </Button>
                    <Button type="submit">確定</Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
