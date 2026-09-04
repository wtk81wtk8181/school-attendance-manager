"use client";

import { FormEvent, useState } from "react";
import { AbsenceDetailFields } from "@/components/absence-detail-fields";
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
import { EARLY_PICKUP_OPTIONS, earlyPickupLabel } from "@/lib/attendance-extras";
import { hongKongHHMM } from "@/lib/digest";
import { cn } from "@/lib/utils";
import type { AbsenceRecord, ContactMethod, DayAttendance, EarlyPickup } from "@/lib/types";

const OPTIONS: { value: DayAttendance; label: string; active: string }[] = [
  {
    value: "present",
    label: "出席",
    active: "bg-emerald-600 text-white hover:bg-emerald-600",
  },
  {
    value: "absent",
    label: "缺席",
    active: "bg-rose-600 text-white hover:bg-rose-600",
  },
  {
    value: "late",
    label: "遲到",
    active: "bg-sky-600 text-white hover:bg-sky-600",
  },
  {
    value: "leave",
    label: "事假",
    active: "bg-amber-600 text-white hover:bg-amber-600",
  },
  {
    value: "half_absent",
    label: "半日缺席",
    active: "bg-orange-600 text-white hover:bg-orange-600",
  },
  {
    value: "early",
    label: "早退",
    active: "bg-violet-600 text-white hover:bg-violet-600",
  },
];

export function AttendanceMark({
  value,
  record,
  disabled,
  onChange,
  onDetailsChange,
}: {
  value: DayAttendance;
  record?: AbsenceRecord;
  disabled?: boolean;
  onChange?: (
    value: DayAttendance,
    extras?: {
      returnedAt?: string;
      earlyReason?: string;
      earlyPickup?: EarlyPickup;
      earlyAt?: string;
    }
  ) => void;
  onDetailsChange?: (next: {
    reason: string;
    calledBy: string;
    calledAt: string;
    contactMethod: ContactMethod;
    contactedOn: string;
  }) => void;
}) {
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [earlyPickup, setEarlyPickup] = useState<EarlyPickup>("father");
  const [earlyAt, setEarlyAt] = useState(hongKongHHMM());

  function openEarlyDialog() {
    setEarlyReason(
      record?.eclassStatus === "early" && record.reason && record.reason !== "早退"
        ? record.reason
        : ""
    );
    setEarlyPickup(record?.earlyPickup ?? "father");
    setEarlyAt(record?.earlyAt || hongKongHHMM());
    setEarlyOpen(true);
  }

  function submitEarly(event: FormEvent) {
    event.preventDefault();
    if (!earlyReason.trim()) return;
    onChange?.("early", {
      earlyReason: earlyReason.trim(),
      earlyPickup,
      earlyAt: earlyAt || hongKongHHMM(),
    });
    setEarlyOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex max-w-xl flex-wrap rounded-lg border bg-white p-0.5">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (option.value === "early") {
                  openEarlyDialog();
                  return;
                }
                if (option.value === "half_absent") {
                  const nextTime =
                    value === "half_absent" && record?.returnedAt
                      ? record.returnedAt
                      : hongKongHHMM();
                  onChange?.("half_absent", { returnedAt: nextTime });
                  return;
                }
                onChange?.(option.value);
              }}
              className={cn(
                "h-8 min-w-14 rounded-md px-2 text-xs font-semibold transition-colors duration-200",
                selected
                  ? option.active
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-900",
                disabled && "cursor-default opacity-80"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {value === "half_absent" ? (
        <div className="flex items-center gap-2 text-xs">
          <Label htmlFor={`return-${record?.id ?? "new"}`} className="whitespace-nowrap">
            回校時間
          </Label>
          {disabled ? (
            <span className="text-slate-400">{record?.returnedAt || "—"}</span>
          ) : (
            <Input
              id={`return-${record?.id ?? "new"}`}
              type="time"
              className="h-8 w-32"
              value={record?.returnedAt || hongKongHHMM()}
              onChange={(event) =>
                onChange?.("half_absent", { returnedAt: event.target.value })
              }
            />
          )}
        </div>
      ) : null}

      {record &&
      ["absent", "late", "leave", "half_absent"].includes(value) ? (
        <div className="flex flex-wrap gap-2 rounded-md border bg-muted/20 p-2">
          <AbsenceDetailFields
            compact
            labels
            reason={record.reason}
            calledBy={record.calledBy ?? ""}
            calledAt={record.calledAt ?? ""}
            contactMethod={record.contactMethod}
            contactedOn={record.contactedOn ?? ""}
            recordDate={record.date}
            disabled={disabled}
            onChange={(next) => onDetailsChange?.(next)}
          />
        </div>
      ) : null}

      {value === "early" && record ? (
        <p className="text-xs text-slate-400">
          {record.reason?.trim() && record.reason !== "早退" ? `因${record.reason}` : ""}
          於{record.earlyAt || "—"}早退（{earlyPickupLabel(record.earlyPickup)}），計入 0.5 日缺席
          {!disabled ? (
            <button
              type="button"
              className="ml-2 underline"
              onClick={openEarlyDialog}
            >
              修改
            </button>
          ) : null}
        </p>
      ) : null}

      <Dialog open={earlyOpen} onOpenChange={setEarlyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>登記早退</DialogTitle>
            <DialogDescription>
              請填寫早退原因、離開方式及時間。早退會計入 0.5 日缺席。時間預設為現在，可再修改。
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitEarly}>
            <div className="grid gap-1.5">
              <Label htmlFor="early-reason">早退原因</Label>
              <Input
                id="early-reason"
                value={earlyReason}
                placeholder="例如：發燒"
                onChange={(event) => setEarlyReason(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>接送／離開方式</Label>
              <Select
                value={earlyPickup}
                onValueChange={(value) => setEarlyPickup((value as EarlyPickup) ?? "father")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇">
                    {earlyPickupLabel(earlyPickup)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EARLY_PICKUP_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="early-at">早退時間</Label>
              <Input
                id="early-at"
                type="time"
                value={earlyAt}
                onChange={(event) => setEarlyAt(event.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!earlyReason.trim()}>
                確認早退
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
