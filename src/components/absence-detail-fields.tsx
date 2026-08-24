"use client";

import type { ReactNode } from "react";
import { TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ABSENCE_REASONS,
  CALLER_RELATIONS,
  joinCaller,
  joinReason,
  splitCaller,
  splitReason,
} from "@/lib/absence-options";

export function AbsenceDetailFields({
  reason,
  calledBy,
  calledAt,
  disabled,
  compact,
  asCells,
  onChange,
}: {
  reason: string;
  calledBy: string;
  calledAt: string;
  disabled?: boolean;
  compact?: boolean;
  asCells?: boolean;
  onChange: (next: { reason: string; calledBy: string; calledAt: string }) => void;
}) {
  const reasonParts = splitReason(reason);
  const callerParts = splitCaller(calledBy);
  const stack = compact ? "space-y-1.5 min-w-40" : "grid gap-1.5";

  const wrap = (node: ReactNode) =>
    asCells ? <TableCell>{node}</TableCell> : node;

  return (
    <>
      {wrap(
      <div className={stack}>
        <Select
          value={reasonParts.option}
          disabled={disabled}
          onValueChange={(value) => {
            if (!value) return;
            onChange({
              reason: joinReason(value, reasonParts.other),
              calledBy,
              calledAt,
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="請假原因" />
          </SelectTrigger>
          <SelectContent>
            {ABSENCE_REASONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {reasonParts.option === "其他" ? (
          <Input
            disabled={disabled}
            value={reasonParts.other}
            placeholder="請填寫其他原因"
            onChange={(event) =>
              onChange({
                reason: joinReason("其他", event.target.value),
                calledBy,
                calledAt,
              })
            }
          />
        ) : null}
      </div>
      )}

      {wrap(
      <div className={stack}>
        <Select
          value={callerParts.relation}
          disabled={disabled}
          onValueChange={(value) => {
            if (!value) return;
            onChange({
              reason,
              calledBy: joinCaller(value, callerParts.name),
              calledAt,
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="致電人士" />
          </SelectTrigger>
          <SelectContent>
            {CALLER_RELATIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {callerParts.relation !== "尚未致電" ? (
          <Input
            disabled={disabled}
            value={callerParts.name}
            placeholder={
              callerParts.relation === "其他" ? "請填寫致電人士" : "姓氏（可選，如陳太）"
            }
            onChange={(event) =>
              onChange({
                reason,
                calledBy: joinCaller(callerParts.relation, event.target.value),
                calledAt,
              })
            }
          />
        ) : null}
      </div>
      )}

      {wrap(
      <Input
        type="time"
        disabled={disabled}
        value={calledAt}
        className={compact ? "w-32" : undefined}
        onChange={(event) =>
          onChange({
            reason,
            calledBy,
            calledAt: event.target.value,
          })
        }
      />
      )}
    </>
  );
}
