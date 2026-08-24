"use client";

import { cn } from "@/lib/utils";
import type { DayAttendance } from "@/lib/types";

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
];

export function AttendanceMark({
  value,
  disabled,
  onChange,
}: {
  value: DayAttendance;
  disabled?: boolean;
  onChange?: (value: DayAttendance) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-white p-0.5">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "h-8 min-w-14 rounded-md px-2.5 text-xs font-semibold transition-colors",
              selected
                ? option.active
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              disabled && "cursor-default opacity-80"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
