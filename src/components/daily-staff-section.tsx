"use client";

import { FormEvent, useState } from "react";
import { Plus, Users } from "lucide-react";
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
import { STAFF_ABSENCE_ROWS, staffDailyFor, staffIdsForKind } from "@/lib/staff";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function DailyStaffSection({ date }: { date: string }) {
  const { state, addStaffMember, removeStaffMember, toggleStaffAbsence } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const members = state.staffMembers ?? [];
  const daily = staffDailyFor(state.staffDailyAbsences, date);

  function submitName(event: FormEvent) {
    event.preventDefault();
    if (!addStaffMember(name)) {
      toast.error(name.trim() ? "此教職員名稱已在名單中。" : "請輸入教職員名稱。");
      return;
    }
    setName("");
    toast.success("已加入教職員名單。");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">教職員缺席情況</p>
          <p className="text-xs text-muted-foreground">
            先在對話框填入教職員名稱，再於病假、事假、公假、早退四行勾選當日缺席同事。同一人只會出現在其中一行。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Users className="size-4" />
          編輯教職員名單
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          尚未有教職員名稱。請先開啟對話框新增，例如校長、主任或當日缺席的同事。
        </p>
      ) : (
        <div className="space-y-3">
          {STAFF_ABSENCE_ROWS.map((row) => {
            const selected = new Set(staffIdsForKind(daily, row.kind));
            return (
              <div key={row.kind} className="rounded-lg border bg-white p-3">
                <p className="text-sm font-medium">{row.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {members.map((member) => (
                    <label
                      key={`${row.kind}-${member.id}`}
                      htmlFor={`staff-${row.kind}-${member.id}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <Checkbox
                        id={`staff-${row.kind}-${member.id}`}
                        checked={selected.has(member.id)}
                        onCheckedChange={(checked) =>
                          toggleStaffAbsence(date, row.kind, member.id, checked === true)
                        }
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>教職員名稱</DialogTitle>
            <DialogDescription>
              在此新增或刪除名稱。儲存後可於下面四行勾選當日病假、事假、公假或早退的同事。
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
    </div>
  );
}
